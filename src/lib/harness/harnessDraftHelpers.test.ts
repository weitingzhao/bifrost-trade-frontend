import { describe, expect, it } from 'vitest'
import {
  BRIEFING_KINDS,
  LOOP_KINDS,
  isDecisionKind,
  candidateBatchDataSource,
  candidateBatchItems,
  computePolicySuggestionRows,
  formatPolicyValue,
  hitRateFailingLenses,
  isHitRateWarnActive,
  POLICY_SUGGESTION_KEYS,
} from './harnessDraftHelpers'

describe('computePolicySuggestionRows', () => {
  it('returns rows only for whitelist keys present in either dict', () => {
    const rows = computePolicySuggestionRows({
      current_policy: { min_hit_rate: 0.55, seed_symbols: ['AAPL'] },
      suggestion: { min_hit_rate: 0.7, preset: 'momentum' },
    })
    // seed_symbols is not in the whitelist and must NOT surface
    expect(rows.map((r) => r.key)).toEqual(['preset', 'min_hit_rate'])
  })

  it('flags changed rows correctly and preserves canonical order', () => {
    const rows = computePolicySuggestionRows({
      current_policy: { min_hit_rate: 0.55, preset: 'momentum' },
      suggestion: { min_hit_rate: 0.7, preset: 'momentum' },
    })
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r]))
    expect(byKey.min_hit_rate.changed).toBe(true)
    expect(byKey.preset.changed).toBe(false)
    // POLICY_SUGGESTION_KEYS ordering
    const orderKeys = rows.map((r) => r.key)
    const canonicalOrder = POLICY_SUGGESTION_KEYS.filter((k) =>
      orderKeys.includes(k),
    )
    expect(orderKeys).toEqual(canonicalOrder)
  })

  it('marks rows unchanged when suggestion omits the key even if current has it', () => {
    const rows = computePolicySuggestionRows({
      current_policy: { min_hit_rate: 0.6 },
      suggestion: { preset: 'neutral' },
    })
    const minHr = rows.find((r) => r.key === 'min_hit_rate')!
    expect(minHr.changed).toBe(false)
    expect(minHr.current).toBe(0.6)
    expect(minHr.proposed).toBeUndefined()
  })

  it('handles missing dicts gracefully', () => {
    expect(computePolicySuggestionRows({})).toEqual([])
    expect(
      computePolicySuggestionRows({ suggestion: { min_hit_rate: 0.7 } }),
    ).toEqual([
      { key: 'min_hit_rate', current: undefined, proposed: 0.7, changed: true },
    ])
  })
})

describe('isHitRateWarnActive', () => {
  it('true only when explicitly === true', () => {
    expect(isHitRateWarnActive({ hit_rate_warn: true })).toBe(true)
    expect(isHitRateWarnActive({ hit_rate_warn: false })).toBe(false)
    expect(isHitRateWarnActive({ hit_rate_warn: 'true' })).toBe(false)
    expect(isHitRateWarnActive({})).toBe(false)
  })
})

describe('hitRateFailingLenses', () => {
  it('reads gate.failing string array', () => {
    expect(
      hitRateFailingLenses({
        hit_rate_gate: { failing: ['iv_rank', 'vrp'] },
      }),
    ).toEqual(['iv_rank', 'vrp'])
  })

  it('drops non-string entries', () => {
    expect(
      hitRateFailingLenses({
        hit_rate_gate: { failing: ['iv_rank', 42, null] },
      }),
    ).toEqual(['iv_rank'])
  })

  it('returns [] when gate missing', () => {
    expect(hitRateFailingLenses({})).toEqual([])
    expect(hitRateFailingLenses({ hit_rate_gate: null })).toEqual([])
    expect(hitRateFailingLenses({ hit_rate_gate: { failing: 'nope' } })).toEqual([])
  })
})

describe('candidateBatch helpers', () => {
  it('candidateBatchItems keeps only well-formed rows', () => {
    expect(
      candidateBatchItems({
        items: [
          { id: 'c1', symbol: 'AAPL', score: 82 },
          { id: 'c2', symbol: 'MSFT', score: null },
          { symbol: 'no_id' }, // dropped
          null, // dropped
        ],
      }),
    ).toEqual([
      { id: 'c1', symbol: 'AAPL', score: 82, evidence: null },
      { id: 'c2', symbol: 'MSFT', score: null, evidence: null },
    ])
  })

  it('candidateBatchDataSource returns string or null', () => {
    expect(candidateBatchDataSource({ data_source: 'scan' })).toBe('scan')
    expect(candidateBatchDataSource({ data_source: '' })).toBeNull()
    expect(candidateBatchDataSource({})).toBeNull()
  })
})

describe('formatPolicyValue', () => {
  it('handles primitives + undefined', () => {
    expect(formatPolicyValue(undefined)).toBe('—')
    expect(formatPolicyValue(null)).toBe('null')
    expect(formatPolicyValue(0.7)).toBe('0.7')
    expect(formatPolicyValue('iv_rank:hot')).toBe('iv_rank:hot')
    expect(formatPolicyValue('')).toBe('(empty)')
    expect(formatPolicyValue(true)).toBe('true')
  })

  it('serialises objects', () => {
    expect(formatPolicyValue({ a: 1 })).toBe('{"a":1}')
  })
})

describe('candidate evidence', () => {
  it('carries the evidence chain through when present', () => {
    const [item] = candidateBatchItems({
      items: [
        {
          id: 'c1',
          symbol: 'PAYS',
          score: 82.75,
          evidence: {
            selection: { status: 'ok', sepa_score: 82.75, path: 'PIVOT' },
            option_analytics: { status: 'not_measured', reason: 'no option data' },
            invalidation: ['sepa_score falls below 70'],
          },
        },
      ],
    })
    expect(item.evidence?.selection?.path).toBe('PIVOT')
    expect(item.evidence?.option_analytics?.status).toBe('not_measured')
    expect(item.evidence?.invalidation).toHaveLength(1)
  })

  it('reads a malformed evidence field as absent rather than throwing', () => {
    const [item] = candidateBatchItems({
      items: [{ id: 'c1', symbol: 'AAPL', score: 1, evidence: 'oops' }],
    })
    expect(item.evidence).toBeNull()
  })
})

describe('draft kind classification', () => {
  it('treats loop drafts as decisions — they carry Approve / Dismiss', () => {
    expect(isDecisionKind('candidate_batch')).toBe(true)
    expect(isDecisionKind('policy_suggestion')).toBe(true)
  })

  it('keeps recurring briefings out of the decisions view', () => {
    expect(isDecisionKind('morning_brief')).toBe(false)
    expect(isDecisionKind('eod_verdict')).toBe(false)
  })

  it('shows an unrecognised kind rather than hiding it', () => {
    // order_intent is emitted by the backend and absent from DraftKind; an
    // allowlist would have made it invisible on the default view.
    expect(isDecisionKind('order_intent')).toBe(true)
    expect(isDecisionKind('something_new')).toBe(true)
  })

  it('keeps the Loop tab as a narrower view of the same drafts', () => {
    for (const kind of LOOP_KINDS) {
      expect(isDecisionKind(kind)).toBe(true)
    }
    expect(BRIEFING_KINDS.has('morning_brief')).toBe(true)
  })
})
