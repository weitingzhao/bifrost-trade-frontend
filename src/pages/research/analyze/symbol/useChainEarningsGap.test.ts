import { describe, expect, it } from 'vitest'
import type { ExpectedEarnings } from '@/api/research/narrative'
import { chainEarningsGap } from './useChainEarningsGap'

// Invented estimate, term and strikes.
const est = (days_away: number, max = 0): ExpectedEarnings => ({
  date: '2031-11-03',
  basis: 'same quarter last year + 52 weeks',
  from: '2030-11-04',
  days_away,
  track: { n: 4, median_miss_days: 0, max_miss_days: max },
})
const TERM = [
  { expiry: '2031-10-31', dte: 35, iv: 0.45 },
  { expiry: '2031-11-07', dte: 42, iv: 0.58 },
]
const STRIKES = [170, 175, 180, 185, 190, 195, 200, 205, 210]

describe('the Chain face’s earnings gap', () => {
  it('places the two levels at spot × (1 ∓ gap) and rules the nearest strikes', () => {
    const g = chainEarningsGap(est(38), TERM, 190, 42, STRIKES)
    expect(g.move).toBeCloseTo(0.099, 3)
    expect(g.chips.map((c) => [c.label, c.k])).toEqual([
      ['E −gap', 171],
      ['E +gap', 209],
    ])
    expect([g.loStrike, g.hiStrike]).toEqual([170, 210])
    expect([g.ruled(170), g.ruled(210), g.ruled(190)]).toEqual(['E −gap', 'E +gap', null])
    expect(g.title).toContain('45.0% on 10-31 before it against 58.0% on 11-07 after')
  })

  it('keeps two decimals under 50 and marks an expiry within the estimate’s miss with ?', () => {
    const g = chainEarningsGap(est(38, 7), TERM, 17.5, 42, [16, 17.5, 19])
    expect(g.chips.map((c) => c.label)).toEqual(['E −gap?', 'E +gap?'])
    expect(g.chips[0].k).toBe(Number((17.5 * (1 - (g.move as number))).toFixed(2)))
  })

  it('draws nothing past the expiry, for a late print, or without a premium', () => {
    expect(chainEarningsGap(est(38), TERM, 190, 21, STRIKES).move).toBeNull()
    expect(chainEarningsGap(est(-3), TERM, 190, 42, STRIKES).chips).toEqual([])
    expect(chainEarningsGap(est(38), [TERM[0], { ...TERM[1], iv: 0.4 }], 190, 42, STRIKES).ruled(170)).toBeNull()
  })
})
