import { describe, it, expect } from 'vitest'
import {
  AlertsResponseSchema,
  CandidateListResponseSchema,
  HypothesisSummaryActiveSchema,
} from './researchData'

/** Verbatim from /research/alerts on 2026-09-09. */
const ALERTS = {
  count: 3,
  items: [
    {
      trade_date: '2026-09-04',
      kind: 'hit_rate_drop',
      symbol: null,
      lens: 'vrp',
      severity: 'warn',
      reason: {
        side: 'hot',
        curr_n: 4,
        prev_n: 8,
        drop_pp: 25.0,
        curr_rate: 0.5,
        prev_rate: 0.75,
      },
      computed_at: '2026-09-09T22:31:03.066952+00:00',
    },
  ],
}

/** Verbatim from /research/candidates on 2026-09-09. */
const CANDIDATES = {
  count: 42,
  items: [
    {
      id: 'cand-lpg-836fcea8d7',
      trade_date: '2026-09-08',
      symbol: 'LPG',
      source: 'harness',
      source_ref: { run_id: 'run_1a081364889cde94e', objective_id: 'obj-daily-loop-stock' },
      score: 77.0,
      lens_snapshot: {
        path: 'PIVOT',
        grade: 'A',
        stage: 'STAGE_2A',
        sepa_score: 77.0,
        momentum_score: 60.0,
      },
      tags: ['harness', 'stock_composite'],
      status: 'open',
      hypothesis_id: null,
      owner_id: 'owner',
      created_at: '2026-09-08T05:35:15.404787+00:00',
      ttl_at: '2026-09-13T13:30:13.578059+00:00',
    },
  ],
}

/** Verbatim from /research/hypothesis/summary/active on 2026-09-09. */
const ACTIVE = {
  counts: { validated: 0, active: 24, archived: 0, rejected: 0 },
  total_active: 24,
  recent_active: [
    {
      id: 'daily-loop-stock-explorer-scsc-run-1a081364889cd-403a9bbee2',
      title: 'Daily Loop Stock Explorer · SCSC (run_1a081364889cde94e)',
      thesis: 'Stock-first composite funnel (SEPA / Momentum / Events)…',
      symbols: ['SCSC'],
      tags: ['harness', 'candidate_batch', 'stock', 'sepa'],
      status: 'active',
      origin_page: 'copilot-loop',
      origin_ref: { source: 'copilot', candidate_id: 'cand-scsc-836fc498bf' },
      linked_opportunity_ids: [],
      linked_backtest_ids: [],
      conclusion: null,
      created_at: '2026-09-08T05:35:15.404787+00:00',
      updated_at: '2026-09-08T05:35:15.404787+00:00',
      retired_at: null,
    },
  ],
}

describe('research data-plane schemas accept what the API actually sends', () => {
  it('parses a real alerts response, nested reason object and all', () => {
    expect(AlertsResponseSchema.safeParse(ALERTS).success).toBe(true)
  })

  it('parses a real candidate list', () => {
    expect(CandidateListResponseSchema.safeParse(CANDIDATES).success).toBe(true)
  })

  it('parses a real active-hypothesis summary', () => {
    expect(HypothesisSummaryActiveSchema.safeParse(ACTIVE).success).toBe(true)
  })

  it('keeps fields the schema does not name — passthrough, not strip', () => {
    // The UI reads `reason` and `lens_snapshot`, neither of which the schema
    // enumerates. A stripping schema would silently empty the cards.
    const out = AlertsResponseSchema.parse(ALERTS) as typeof ALERTS
    expect(out.items[0].reason).toBeDefined()
    const c = CandidateListResponseSchema.parse(CANDIDATES) as typeof CANDIDATES
    expect(c.items[0].lens_snapshot.grade).toBe('A')
  })
})

describe('and reject the drift they exist to catch', () => {
  it('flags a severity that stopped being a string', () => {
    const drifted = { ...ALERTS, items: [{ ...ALERTS.items[0], severity: 3 }] }
    expect(AlertsResponseSchema.safeParse(drifted).success).toBe(false)
  })

  it('flags a score that arrives as a formatted string', () => {
    const drifted = { ...CANDIDATES, items: [{ ...CANDIDATES.items[0], score: '77.0' }] }
    expect(CandidateListResponseSchema.safeParse(drifted).success).toBe(false)
  })

  it('flags a dropped required field rather than passing it through', () => {
    const { total_active: _drop, ...rest } = ACTIVE
    expect(HypothesisSummaryActiveSchema.safeParse(rest).success).toBe(false)
  })

  it('accepts null where the API genuinely sends null', () => {
    // symbol and hypothesis_id are nullable on purpose — a market-wide alert
    // has no symbol, and an unpromoted candidate has no hypothesis.
    expect(AlertsResponseSchema.safeParse(ALERTS).success).toBe(true)
    expect(CANDIDATES.items[0].hypothesis_id).toBeNull()
  })
})
