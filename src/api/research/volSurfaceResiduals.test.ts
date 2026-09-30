import { describe, expect, it } from 'vitest'
import { outOfTheMoneyPerStrike, type VolSurfaceResidualRow } from '@/api/research/volSurface'

/** Every figure here is invented. */
function row(strike: number, k: number, right: 'C' | 'P' | null, iv: number): VolSurfaceResidualRow {
  return {
    symbol: 'XYZ',
    trade_date: '2026-09-29',
    expiry: '2026-10-30',
    strike,
    log_moneyness: k,
    iv_market: iv,
    iv_fitted: iv,
    residual: 0,
    residual_z: 0,
    computed_at: null,
    option_right: right,
  }
}

describe('residuals, one contract per strike', () => {
  it('keeps the put below spot and the call at or above it', () => {
    const out = outOfTheMoneyPerStrike([
      row(90, -0.1, 'C', 0.4),
      row(90, -0.1, 'P', 0.3),
      row(100, 0, 'P', 0.26),
      row(100, 0, 'C', 0.25),
      row(110, 0.1, 'P', 0.5),
      row(110, 0.1, 'C', 0.24),
    ])
    expect(out.map((r) => [r.strike, r.option_right])).toEqual([
      [90, 'P'],
      [100, 'C'],
      [110, 'C'],
    ])
  })

  it('keeps a lone contract, whichever side it is', () => {
    const out = outOfTheMoneyPerStrike([row(90, -0.1, 'C', 0.4), row(110, 0.1, 'P', 0.5)])
    expect(out.map((r) => r.option_right)).toEqual(['C', 'P'])
  })

  it('passes an older API through untouched (one row per strike, no right)', () => {
    const out = outOfTheMoneyPerStrike([row(100, 0, null, 0.25), row(95, -0.05, null, 0.27)])
    expect(out.map((r) => r.strike)).toEqual([95, 100])
  })
})
