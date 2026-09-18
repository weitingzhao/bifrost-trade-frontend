import { describe, expect, it } from 'vitest'
import type { PositionAttribution } from '@/types/positions'
import { assignmentTotals, buildAssignmentLegs, thinExtrinsic } from './assignmentRisk'

function leg(over: Partial<PositionAttribution>): PositionAttribution {
  return {
    account_id: 'U0000001',
    contract_key: 'ZZZ|OPT|20261016|90.0|P',
    symbol: 'ZZZ  261016P00090000',
    sec_type: 'OPT',
    expiry: '20261016',
    strike: 90,
    option_right: 'P',
    position_qty: -1,
    ...over,
  } as PositionAttribution
}

const MARKS = new Map([
  ['ZZZ|OPT|20261016|90.0|P', { close: 6, asOf: null }],
  ['ZZZ|OPT|20261016|110.0|C', { close: 0.05, asOf: null }],
])
const DELTAS = new Map([
  ['ZZZ|OPT|20261016|90.0|P', -0.62],
  ['ZZZ|OPT|20261016|110.0|C', 0.04],
])
const SPOTS = new Map([['ZZZ', 85]])
const DTE = () => 29

describe('buildAssignmentLegs', () => {
  it('takes only shorts, tightest first, and says what the position becomes', () => {
    const legs = buildAssignmentLegs({
      attributions: [
        leg({}),
        leg({ contract_key: 'ZZZ|OPT|20261016|110.0|C', strike: 110, option_right: 'C', position_qty: -2 }),
        // A long is exercised by its holder, who is you — it is not an assignment.
        leg({ contract_key: 'long', position_qty: 3 }),
      ],
      markByKey: MARKS,
      deltaByKey: DELTAS,
      spotBySymbol: SPOTS,
      dteByExpiry: DTE,
    })
    expect(legs.map((l) => l.strike)).toEqual([90, 110])
    // Spot 85 against a 90 put: 5.9% in the money, worth 5 with 1 of time left.
    expect(legs[0]).toMatchObject({ contracts: 1, itm: true, intrinsic: 5, extrinsic: 1, absDelta: 0.62 })
    expect(legs[0].cushionPct).toBeCloseTo(-0.0588)
    // Assigned, the put buys 100 shares at 90.
    expect(legs[0]).toMatchObject({ sharesAfter: 100, cashAfter: -9_000 })
    // The call is far out of the money and would call 200 shares away.
    expect(legs[1]).toMatchObject({ itm: false, intrinsic: 0, extrinsic: 0.05, sharesAfter: -200, cashAfter: 22_000 })
  })

  it('folds one contract held short in two accounts into one decision', () => {
    const legs = buildAssignmentLegs({
      attributions: [leg({ account_id: 'A', position_qty: -1 }), leg({ account_id: 'B', position_qty: -2 })],
      markByKey: MARKS,
      deltaByKey: DELTAS,
      spotBySymbol: SPOTS,
      dteByExpiry: DTE,
    })
    expect(legs).toHaveLength(1)
    expect(legs[0]).toMatchObject({ contracts: 3, sharesAfter: 300, cashAfter: -27_000 })
  })

  it('leaves the readings null when nothing priced the leg, rather than calling it safe', () => {
    const [l] = buildAssignmentLegs({
      attributions: [leg({ contract_key: 'unpriced' })],
      markByKey: MARKS,
      deltaByKey: new Map(),
      spotBySymbol: new Map(),
      dteByExpiry: DTE,
    })
    expect(l.mark).toBeNull()
    expect(l.extrinsic).toBeNull()
    expect(l.cushionPct).toBeNull()
    expect(l.itm).toBeNull()
    expect(l.absDelta).toBeNull()
  })
})

describe('assignmentTotals', () => {
  it('counts only what is in the money — an OTM leg is not what the book becomes', () => {
    const legs = buildAssignmentLegs({
      attributions: [
        leg({}),
        leg({ contract_key: 'ZZZ|OPT|20261016|110.0|C', strike: 110, option_right: 'C', position_qty: -2 }),
      ],
      markByKey: MARKS,
      deltaByKey: DELTAS,
      spotBySymbol: SPOTS,
      dteByExpiry: DTE,
    })
    expect(assignmentTotals(legs)).toEqual({
      legs: 2,
      itm: 1,
      sharesIn: 100,
      sharesOut: 0,
      cashIfAllItmAssign: -9_000,
      unpriced: 0,
      disagreeing: 0,
    })
  })
})

describe('thinExtrinsic', () => {
  it('names the legs whose time value is thin — where exercising costs the holder little', () => {
    const legs = buildAssignmentLegs({
      attributions: [
        leg({}),
        leg({ contract_key: 'ZZZ|OPT|20261016|110.0|C', strike: 110, option_right: 'C', position_qty: -1 }),
      ],
      markByKey: MARKS,
      deltaByKey: DELTAS,
      spotBySymbol: SPOTS,
      dteByExpiry: DTE,
    })
    // 0.05 of time value left is thin; 1.00 is not.
    expect(thinExtrinsic(legs).map((l) => l.strike)).toEqual([110])
  })
})

describe('when the vendor disagrees with itself', () => {
  it('marks a leg whose delta and moneyness tell different stories', () => {
    // Measured on DEV: a 33% out-of-the-money call carrying delta 0.80, on a
    // contract whose day volume was 1. Neither figure is corrected — the page
    // says the source disagrees with itself.
    const [far] = buildAssignmentLegs({
      attributions: [leg({ contract_key: 'far', strike: 280, option_right: 'C', position_qty: -1 })],
      markByKey: new Map([['far', { close: 84, asOf: null }]]),
      deltaByKey: new Map([['far', 0.8]]),
      spotBySymbol: SPOTS,
      dteByExpiry: DTE,
    })
    expect(far).toMatchObject({ itm: false, absDelta: 0.8, deltaDisagrees: true })
    expect(assignmentTotals([far]).disagreeing).toBe(1)
  })

  it('leaves a leg alone when the two agree, and when there is no delta at all', () => {
    const legs = buildAssignmentLegs({
      attributions: [
        leg({}),
        leg({ contract_key: 'nodelta', strike: 70, option_right: 'P', position_qty: -1 }),
      ],
      markByKey: MARKS,
      deltaByKey: new Map([['ZZZ|OPT|20261016|90.0|P', -0.62]]),
      spotBySymbol: SPOTS,
      dteByExpiry: DTE,
    })
    // In the money with a delta past the coin flip: the two agree.
    expect(legs[0].deltaDisagrees).toBe(false)
    // No delta is not a disagreement.
    expect(legs[1].deltaDisagrees).toBe(false)
  })
})
