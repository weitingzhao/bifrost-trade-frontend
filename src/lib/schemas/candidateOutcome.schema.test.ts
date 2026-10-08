import { describe, expect, it } from 'vitest'

function drop<T extends object>(obj: T, key: keyof T): Omit<T, keyof T> {
  const next = { ...obj }
  delete next[key]
  return next
}
import {
  CandidateOutcomeRowsSchema,
  CandidateOutcomeSummarySchema,
} from '@/lib/schemas/research'

/** Shape measured on DEV research-api 2026-10-07. Prices are strings. */
const row = {
  candidate_id: 'cand-aaa',
  symbol: 'AAA',
  trade_date: '2026-10-05',
  horizon_days: 1,
  entry_close: '10.00',
  exit_close: '11.00',
  exit_date: '2026-10-06',
  forward_return: '0.10',
  benchmark_symbol: 'SPY',
  benchmark_return: '0.01',
  excess_return: '0.09',
  hit: false,
  source: 'harness',
  regime: 'trending',
  regime_scope: 'symbol',
  regime_date: '2026-10-05',
}

const slice = {
  regime: 'trending',
  horizon_days: 5,
  settled: 31,
  judged: 31,
  hits: 24,
  hit_rate: 0.77,
  avg_excess: 0.02,
}

describe('candidate outcome schema', () => {
  it('accepts the measured summary, including by_regime, and a summary that omits it', () => {
    const withRegime = CandidateOutcomeSummarySchema.safeParse({
      candidates: 126,
      pending: 4,
      horizons: [
        {
          horizon_days: 5,
          settled: 96,
          judged: 96,
          hits: 49,
          hit_rate: 0.51,
          avg_return: 0.01,
          avg_benchmark: 0,
          avg_excess: 0.01,
        },
      ],
      by_regime: [slice, { ...slice, regime: null, hit_rate: null, avg_excess: null }],
    })
    expect(withRegime.success).toBe(true)
    const plain = CandidateOutcomeSummarySchema.safeParse({
      candidates: 1,
      pending: 0,
      horizons: [],
    })
    expect(plain.success).toBe(true)
  })

  it('rejects a regime slice that is missing settled or hit_rate', () => {
    expect(
      CandidateOutcomeSummarySchema.safeParse({
        candidates: 1,
        pending: 0,
        horizons: [],
        by_regime: [drop(slice, 'settled')],
      }).success,
    ).toBe(false)
    expect(
      CandidateOutcomeSummarySchema.safeParse({
        candidates: 1,
        pending: 0,
        horizons: [],
        by_regime: [drop(slice, 'hit_rate')],
      }).success,
    ).toBe(false)
  })

  it('accepts a measured row and rejects one that drops regime', () => {
    expect(CandidateOutcomeRowsSchema.safeParse({ rows: [row], count: 1 }).success).toBe(true)
    expect(CandidateOutcomeRowsSchema.safeParse({ rows: [drop(row, 'regime')], count: 1 }).success).toBe(
      false,
    )
  })
})
