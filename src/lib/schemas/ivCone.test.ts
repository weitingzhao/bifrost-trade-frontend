import { describe, expect, it } from 'vitest'
import { IvConeSchema } from './research'

/** From /research/volatility/iv-cone?symbol=PLTR on 2026-09-26 (research 0.130.0). */
const REAL_RESPONSE = {
  symbol: 'PLTR',
  as_of: '2026-09-25',
  window_sessions: 252,
  sessions_in_window: 252,
  min_sessions: 60,
  tenors: [
    {
      tenor_days: 30,
      n: 252,
      first: '2025-09-25',
      last: '2026-09-25',
      today: 0.45957592,
      rule: 'interpolated between the expiries bracketing 30 DTE, the nearest when one-sided (7–90 DTE) — the VRP store\'s IV30',
      p10: 0.459681,
      p25: 0.481259,
      p50: 0.52638,
      p75: 0.611621,
      p90: 0.667496,
      min: 0.405703,
      max: 0.74583,
      today_pctile: 0.1032,
      withheld: null,
    },
    {
      tenor_days: 90,
      n: 33,
      first: '2026-03-20',
      last: '2026-09-25',
      today: 0.54887799,
      rule: 'interpolated between an expiry inside 90 DTE and one past it (7–270 DTE); a session without both is not read',
      p10: null,
      p25: null,
      p50: null,
      p75: null,
      p90: null,
      min: null,
      max: null,
      today_pctile: null,
      withheld: 'read on 33 of 252 sessions — under 60, so no percentile is drawn',
    },
  ],
  source: 'features.option_metric_atm_iv_daily',
}

describe('IvConeSchema', () => {
  it('accepts the real response, a withheld horizon included', () => {
    expect(IvConeSchema.safeParse(REAL_RESPONSE).success).toBe(true)
  })

  it('rejects a broken shape', () => {
    const broken = { ...REAL_RESPONSE, tenors: [{ ...REAL_RESPONSE.tenors[0], p50: '0.52' }] }
    expect(IvConeSchema.safeParse(broken).success).toBe(false)
    expect(IvConeSchema.safeParse({ ...REAL_RESPONSE, tenors: undefined }).success).toBe(false)
  })

  it('lets an added field through', () => {
    const grown = { ...REAL_RESPONSE, series: [], tenors: REAL_RESPONSE.tenors.map((t) => ({ ...t, p95: null })) }
    expect(IvConeSchema.safeParse(grown).success).toBe(true)
  })
})
