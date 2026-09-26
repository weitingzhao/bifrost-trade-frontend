import { describe, expect, it } from 'vitest'
import type { ChainContract } from '@/utils/optionChain'
import {
  buildPayoffStructure,
  greeksBySpot,
  legFromParams,
  marginEstimate,
  payoffCurves,
  pickDefaultLeg,
  scenarioRows,
  structureValueAt,
} from './payoffModel'

// Invented chain: spot 100, puts and calls every 5 points, IV 40%.
const SPOT = 100
function chain(): ChainContract[] {
  const out: ChainContract[] = []
  for (let k = 70; k <= 130; k += 5) {
    for (const right of ['C', 'P'] as const) {
      const otm = right === 'P' ? Math.max(0, SPOT - k) : Math.max(0, k - SPOT)
      const delta =
        right === 'P' ? -Math.max(0.02, 0.5 - otm * 0.028) : Math.max(0.02, 0.5 - otm * 0.028)
      out.push({
        ticker: `O:TEST261016${right}${String(k * 1000).padStart(8, '0')}`,
        strike: k,
        right,
        mark: Math.max(0.1, 4 - otm * 0.11),
        iv: 0.4,
        delta,
        gamma: 0.02,
        theta: -0.04,
        vega: 0.1,
        oi: 100,
        volume: 10,
      })
    }
  }
  return out
}

describe('the default leg', () => {
  it('is the OTM put nearest |Δ| 0.30 — a seller’s glance, as the design says', () => {
    const leg = pickDefaultLeg(chain(), SPOT)!
    expect(leg.right).toBe('P')
    expect(leg.strike).toBeLessThan(SPOT)
    expect(Math.abs(leg.delta!)).toBeLessThanOrEqual(0.3)
    // 92? strikes step 5: put 95 has otm 5 → |Δ| .36 (>.3); put 90 otm 10 → .22 → nearest .3.
    expect(leg.strike).toBe(90)
  })

  it('answers a deep link only with a contract the chain can price', () => {
    expect(legFromParams(chain(), 90, 'P')?.strike).toBe(90)
    expect(legFromParams(chain(), 91, 'P')).toBeNull()
    expect(legFromParams(chain(), null, null)).toBeNull()
  })
})

describe('one payoff engine', () => {
  it('agrees with the risk profile at expiry — same math, read twice', () => {
    const s = buildPayoffStructure(
      'single',
      'short',
      legFromParams(chain(), 90, 'P')!,
      chain(),
      SPOT
    )
    const mark = legFromParams(chain(), 90, 'P')!.mark!
    // Short put at expiry: keep the credit above the strike…
    expect(structureValueAt(s, SPOT, 110, 0)).toBeCloseTo(mark * 100, 6)
    // …and take the intrinsic below it.
    expect(structureValueAt(s, SPOT, 80, 0)).toBeCloseTo((mark - 10) * 100, 6)
    expect(s.profile?.breakeven_prices[0]).toBeCloseTo(90 - mark, 6)
  })

  it('prices the today line above the expiry line where time value remains (short side)', () => {
    const s = buildPayoffStructure(
      'single',
      'short',
      legFromParams(chain(), 90, 'P')!,
      chain(),
      SPOT
    )
    const c = payoffCurves(s, SPOT, 30, 0.4)!
    const at = (x: number) => c.xs.findIndex((v) => v >= x)
    // At the strike, expiry keeps the whole credit; today still owes time value.
    expect(c.today[at(90)]).toBeLessThan(c.atExpiry[at(90)])
    expect(c.breakeven).toBeCloseTo(90 - legFromParams(chain(), 90, 'P')!.mark!, 1)
    expect(c.pop).toBeGreaterThan(0.5)
    expect(c.pop).toBeLessThanOrEqual(1)
  })

  it('builds the vertical off the adjacent strike and refuses an unquoted wing', () => {
    const s = buildPayoffStructure(
      'vertical',
      'short',
      legFromParams(chain(), 90, 'P')!,
      chain(),
      SPOT
    )
    expect(s.legs.map((l) => l.strike)).toEqual([90, 85])
    // A missing strike only widens the wing; an unquoted one refuses (§2.1).
    const bare = chain().map((c) => (c.right === 'P' && c.strike === 85 ? { ...c, mark: null } : c))
    const s2 = buildPayoffStructure('vertical', 'short', legFromParams(bare, 90, 'P')!, bare, SPOT)
    expect(s2.unquotedWing).toBe(true)
    expect(s2.profile).toBeNull()
  })
})

describe('the tables beside the chart', () => {
  it('marks the band’s own spots and lands flat on the credit', () => {
    const s = buildPayoffStructure(
      'single',
      'short',
      legFromParams(chain(), 90, 'P')!,
      chain(),
      SPOT
    )
    const c = payoffCurves(s, SPOT, 30, 0.4)!
    const rows = scenarioRows(s, SPOT, 30, c.sigma)
    expect(rows.map((r) => r.label)).toEqual(['−2σ', '−1σ', 'flat', '+1σ', '+2σ'])
    const flat = rows.find((r) => r.flat)!
    expect(flat.atExpiry).toBeCloseTo(legFromParams(chain(), 90, 'P')!.mark! * 100, 6)
    // Probabilities read toward the mark's own side, under the ½σ² drift the
    // design's lognormal carries — further marks are strictly less likely.
    expect(rows[0].prob).toBeLessThan(rows[1].prob)
    expect(rows[4].prob).toBeLessThan(rows[3].prob)
    for (const r of rows) expect(r.prob).toBeGreaterThan(0)
    for (const r of rows) expect(r.prob).toBeLessThan(0.6)
  })

  it('adds the earnings-gap rows at spot × (1 ∓ gap), after the σ rows', () => {
    const s = buildPayoffStructure('single', 'short', legFromParams(chain(), 90, 'P')!, chain(), SPOT)
    const c = payoffCurves(s, SPOT, 30, 0.4)!
    const rows = scenarioRows(s, SPOT, 30, c.sigma, 0.1)
    expect(rows.map((r) => r.label).slice(-2)).toEqual(['earnings −gap', 'earnings +gap'])
    expect(rows[5].spot).toBeCloseTo(90, 10)
    expect(rows[6].spot).toBeCloseTo(110, 10)
    expect(rows.filter((r) => r.earnings)).toHaveLength(2)
    expect(scenarioRows(s, SPOT, 30, c.sigma, null)).toHaveLength(5)
  })

  it('sums greeks per contract, stock leg included as delta', () => {
    const s = buildPayoffStructure(
      'covered',
      'short',
      legFromParams(chain(), 110, 'C')!,
      chain(),
      SPOT
    )
    const g = greeksBySpot(s, SPOT, 30)
    expect(g).toHaveLength(5)
    const atSpot = g.find((r) => r.atSpot)!
    // Covered call: +1 from the shares, a short call's negative delta on top.
    expect(atSpot.delta).toBeGreaterThan(0)
    expect(atSpot.delta).toBeLessThan(1)
  })

  it('estimates margin in the design’s own shapes', () => {
    const put = legFromParams(chain(), 90, 'P')!
    const single = buildPayoffStructure('single', 'short', put, chain(), SPOT)
    expect(marginEstimate('single', 'short', single, SPOT)).toBeCloseTo(
      90 * 100 - put.mark! * 100,
      6
    )
    const vert = buildPayoffStructure('vertical', 'short', put, chain(), SPOT)
    const credit = (put.mark! - legFromParams(chain(), 85, 'P')!.mark!) * 100
    expect(marginEstimate('vertical', 'short', vert, SPOT)).toBeCloseTo(5 * 100 - credit, 6)
    const long = buildPayoffStructure('single', 'long', put, chain(), SPOT)
    expect(marginEstimate('single', 'long', long, SPOT)).toBeCloseTo(put.mark! * 100, 6)
  })
})
