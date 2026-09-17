import { describe, expect, it } from 'vitest'
import type { PositionAttribution } from '@/types/positions'
import { buildExpiryLegs, cushionPct, daysTo, groupByExpiry } from './expirationModel'

function leg(over: Partial<PositionAttribution>): PositionAttribution {
  return {
    account_id: 'U0000001',
    contract_key: 'ZZZ|OPT|20261016|90.0|C',
    symbol: 'ZZZ  261016C00090000',
    sec_type: 'OPT',
    expiry: '20261016',
    strike: 90,
    option_right: 'C',
    position_qty: -2,
    ...over,
  } as PositionAttribution
}

const MARKS = new Map([
  ['ZZZ|OPT|20261016|90.0|C', { close: 1.5, asOf: '2026-09-17T19:30:00Z' }],
  ['ZZZ|OPT|20261016|80.0|P', { close: 0.4, asOf: '2026-09-17T19:30:00Z' }],
])
const SPOTS = new Map([['ZZZ', 85]])

describe('cushionPct', () => {
  it('is signed towards trouble, so both rights read the same way', () => {
    // A short call is troubled by spot rising to the strike.
    expect(cushionPct(85, 90, 'C')).toBeCloseTo(0.0588)
    expect(cushionPct(95, 90, 'C')).toBeCloseTo(-0.0526)
    // A short put is troubled by spot falling to it.
    expect(cushionPct(85, 80, 'P')).toBeCloseTo(0.0588)
    expect(cushionPct(75, 80, 'P')).toBeCloseTo(-0.0667)
  })

  it('has no reading without a spot, rather than a zero cushion', () => {
    expect(cushionPct(null, 90, 'C')).toBeNull()
    expect(cushionPct(0, 90, 'C')).toBeNull()
    expect(cushionPct(85, 90, '')).toBeNull()
  })
})

describe('buildExpiryLegs', () => {
  it('prices a leg off the vendor close and says what closing it costs', () => {
    const legs = buildExpiryLegs({
      attributions: [leg({}), leg({ contract_key: 'ZZZ|OPT|20261016|80.0|P', strike: 80, option_right: 'P', position_qty: -1 })],
      markByKey: MARKS,
      spotBySymbol: SPOTS,
    })
    expect(legs).toHaveLength(2)
    // Short 2 at 1.50 → buying them back costs 300.
    expect(legs[0]).toMatchObject({ symbol: 'ZZZ', qty: -2, mark: 1.5, closeCost: 300, itm: false })
    expect(legs[0].markAsOf).toBe('2026-09-17T19:30:00Z')
    expect(legs[0].cushionPct).toBeCloseTo(0.0588)
    expect(legs[1].closeCost).toBeCloseTo(40)
  })

  it('leaves an unpriced leg without a cost rather than calling it free', () => {
    const [l] = buildExpiryLegs({
      attributions: [leg({ contract_key: 'nothing' })],
      markByKey: MARKS,
      spotBySymbol: SPOTS,
    })
    expect(l.mark).toBeNull()
    expect(l.closeCost).toBeNull()
  })

  it('is one row per contract, even when two accounts hold it', () => {
    const legs = buildExpiryLegs({
      attributions: [
        leg({ account_id: 'U0000001', position_qty: -2 }),
        leg({ account_id: 'U0000002', position_qty: -3 }),
      ],
      markByKey: MARKS,
      spotBySymbol: SPOTS,
    })
    expect(legs).toHaveLength(1)
    // Five short at 1.50 — one decision, one row, and both accounts kept.
    expect(legs[0]).toMatchObject({ qty: -5, closeCost: 750 })
    expect(legs[0].accounts).toEqual(['U0000001', 'U0000002'])
  })

  it('keeps a long leg’s sign: buying it back is a credit, not a cost', () => {
    const [l] = buildExpiryLegs({ attributions: [leg({ position_qty: 2 })], markByKey: MARKS, spotBySymbol: SPOTS })
    expect(l.closeCost).toBe(-300)
  })

  it('skips anything that is not an open option leg', () => {
    const legs = buildExpiryLegs({
      attributions: [leg({ sec_type: 'STK' }), leg({ position_qty: 0 })],
      markByKey: MARKS,
      spotBySymbol: SPOTS,
    })
    expect(legs).toEqual([])
  })
})

describe('groupByExpiry', () => {
  it('puts the nearest expiry first, tightest leg first inside it, and counts what it could not price', () => {
    const legs = buildExpiryLegs({
      attributions: [
        leg({}),
        leg({ contract_key: 'ZZZ|OPT|20261016|80.0|P', strike: 80, option_right: 'P', position_qty: -1 }),
        leg({ contract_key: 'later', expiry: '20261218', strike: 120 }),
      ],
      markByKey: MARKS,
      spotBySymbol: SPOTS,
    })
    const groups = groupByExpiry(legs, '2026-09-17')
    expect(groups.map((g) => g.expiry)).toEqual(['20261016', '20261218'])
    expect(groups[0]).toMatchObject({ dte: 29, unpriced: 0, itm: 0, closeCost: 340 })
    // 5.88% on both here, so the order is stable; the later group could not be priced.
    expect(groups[0].tightest).toBeCloseTo(0.0588)
    expect(groups[1]).toMatchObject({ dte: 92, unpriced: 1, closeCost: 0 })
  })
})

describe('daysTo', () => {
  it('counts calendar days and refuses an unreadable date', () => {
    expect(daysTo('20260918', '2026-09-17')).toBe(1)
    expect(daysTo('20260917', '2026-09-17')).toBe(0)
    expect(daysTo('20260910', '2026-09-17')).toBe(-7)
    expect(daysTo('', '2026-09-17')).toBeNull()
  })
})
