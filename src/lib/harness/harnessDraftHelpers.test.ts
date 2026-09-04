import { describe, expect, it } from 'vitest'
import type { AiDraft } from '@/api/researchDrafts'
import {
  BRIEFING_KINDS,
  LOOP_KINDS,
  POLICY_FIELD_HELP,
  POLICY_SUGGESTION_KEYS,
  candidateBatchDataSource,
  candidateBatchItems,
  computePolicySuggestionRows,
  formatPolicyValue,
  groupIdenticalDrafts,
  hitRateFailingLenses,
  isActionableDraft,
  isDecisionKind,
  isHitRateWarnActive,
  policySuggestionMergeCount,
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

describe('personaEvalModeLabel', () => {
  it('labels heuristic vs agent fallback', async () => {
    const { personaEvalModeLabel } = await import('./harnessDraftHelpers')
    expect(personaEvalModeLabel({})).toBeNull()
    expect(personaEvalModeLabel({ persona_eval: { mode: 'heuristic' } })?.label).toBe(
      'heuristic',
    )
    expect(
      personaEvalModeLabel({
        persona_eval: { mode: 'agent', fallback_used: true },
      })?.label,
    ).toBe('agent (fallback)')
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
      {
        id: 'c1',
        symbol: 'AAPL',
        score: 82,
        evidence: null,
        net_stance: null,
        blocked_by_validate: false,
      },
      {
        id: 'c2',
        symbol: 'MSFT',
        score: null,
        evidence: null,
        net_stance: null,
        blocked_by_validate: false,
      },
    ])
  })

  it('candidateBatchDataSource returns string or null', () => {
    expect(candidateBatchDataSource({ data_source: 'scan' })).toBe('scan')
    expect(candidateBatchDataSource({ data_source: '' })).toBeNull()
    expect(candidateBatchDataSource({})).toBeNull()
  })
})

describe('POLICY_FIELD_HELP', () => {
  it('explains every whitelist field', () => {
    // A key added to the whitelist without help text ships a column the reader
    // has to ask about — which is how "null" got into the UI in the first place.
    for (const key of POLICY_SUGGESTION_KEYS) {
      expect(POLICY_FIELD_HELP[key], `missing help for ${key}`).toBeTruthy()
    }
    expect(Object.keys(POLICY_FIELD_HELP).sort()).toEqual([...POLICY_SUGGESTION_KEYS].sort())
  })

  it('says what leaving an optional gate unset does', () => {
    for (const key of ['flag_filter', 'min_composite_score', 'min_hit_rate'] as const) {
      expect(POLICY_FIELD_HELP[key]).toMatch(/not set/i)
    }
  })
})

describe('formatPolicyValue', () => {
  it('handles primitives + undefined', () => {
    expect(formatPolicyValue(undefined)).toBe('—')
    expect(formatPolicyValue(0.7)).toBe('0.7')
    expect(formatPolicyValue('iv_rank:hot')).toBe('iv_rank:hot')
    expect(formatPolicyValue('')).toBe('(empty)')
    expect(formatPolicyValue(true)).toBe('true')
  })

  it('serialises objects', () => {
    expect(formatPolicyValue({ a: 1 })).toBe('{"a":1}')
  })

  it('separates "no constraint" from "not proposed"', () => {
    // Both are absences, and they mean different things: null is a gate that is
    // off, undefined is a field the model left alone. Rendering null as the
    // literal `null` made an unset gate read like a value.
    expect(formatPolicyValue(null)).toBe('not set')
    expect(formatPolicyValue(undefined)).toBe('—')
    expect(formatPolicyValue(null)).not.toBe(formatPolicyValue(undefined))
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

describe('groupIdenticalDrafts', () => {
  function draft(
    id: string,
    createdAt: string,
    payload: Record<string, unknown>,
    kind: AiDraft['kind'] = 'candidate_batch',
  ): AiDraft {
    return {
      id,
      kind,
      payload,
      scope: 'research',
      status: 'pending',
      generated_by: 'harness',
      linked_action_id: null,
      created_at: createdAt,
      expires_at: null,
    }
  }

  function batch(id: string, createdAt: string, objective: string, symbols: string[]) {
    return draft(id, createdAt, {
      objective_id: objective,
      items: symbols.map((s) => ({ id: `cand-${s.toLowerCase()}`, symbol: s, score: 1 })),
    })
  }

  it('collapses repeated runs of one objective into a single decision', () => {
    const groups = groupIdenticalDrafts([
      batch('d1', '2026-09-01T17:24:00Z', 'obj-a', ['NVDA', 'PAYS']),
      batch('d2', '2026-09-01T18:06:00Z', 'obj-a', ['PAYS', 'NVDA']),
      batch('d3', '2026-09-01T20:52:00Z', 'obj-a', ['NVDA', 'PAYS']),
    ])
    expect(groups).toHaveLength(1)
    // Symbol order inside the payload must not defeat the match.
    expect(groups[0].superseded.map((d) => d.id)).toEqual(['d2', 'd1'])
  })

  it('carries the newest draft, not the first seen', () => {
    const groups = groupIdenticalDrafts([
      batch('old', '2026-09-01T05:00:00Z', 'obj-a', ['NNE']),
      batch('new', '2026-09-01T19:52:00Z', 'obj-a', ['NNE']),
    ])
    expect(groups[0].draft.id).toBe('new')
  })

  it('keeps batches that differ by a single symbol apart', () => {
    const groups = groupIdenticalDrafts([
      batch('d1', '2026-09-01T05:00:00Z', 'obj-a', ['MRVL', 'NNE', 'SPX']),
      batch('d2', '2026-09-01T16:02:00Z', 'obj-a', ['MRVL', 'NNE', 'PLTR']),
    ])
    expect(groups).toHaveLength(2)
    expect(groups.every((g) => g.superseded.length === 0)).toBe(true)
  })

  it('never merges across objectives', () => {
    const groups = groupIdenticalDrafts([
      batch('d1', '2026-09-01T05:00:00Z', 'obj-a', ['NVDA']),
      batch('d2', '2026-09-01T06:00:00Z', 'obj-b', ['NVDA']),
    ])
    expect(groups).toHaveLength(2)
  })

  it('leaves non-batch kinds alone even when byte-identical', () => {
    const p = { objective_id: 'obj-a', suggestion: {}, current_policy: {} }
    const groups = groupIdenticalDrafts([
      draft('p1', '2026-09-01T05:00:00Z', p, 'policy_suggestion'),
      draft('p2', '2026-09-01T06:00:00Z', p, 'policy_suggestion'),
    ])
    expect(groups).toHaveLength(2)
  })

  it('does not group a batch that carries no objective', () => {
    const groups = groupIdenticalDrafts([
      draft('d1', '2026-09-01T05:00:00Z', { items: [] }),
      draft('d2', '2026-09-01T06:00:00Z', { items: [] }),
    ])
    expect(groups).toHaveLength(2)
  })

  it('keeps surviving groups in first-appearance order', () => {
    const groups = groupIdenticalDrafts([
      batch('a1', '2026-09-01T05:00:00Z', 'obj-a', ['NVDA']),
      batch('b1', '2026-09-01T06:00:00Z', 'obj-b', ['TSLA']),
      batch('a2', '2026-09-01T07:00:00Z', 'obj-a', ['NVDA']),
    ])
    expect(groups.map((g) => g.draft.id)).toEqual(['a2', 'b1'])
  })

  it('orders deterministically when timestamps tie or do not parse', () => {
    const groups = groupIdenticalDrafts([
      batch('d1', 'not-a-date', 'obj-a', ['NVDA']),
      batch('d2', 'not-a-date', 'obj-a', ['NVDA']),
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0].draft.id).toBe('d2')
    expect(groups[0].superseded.map((d) => d.id)).toEqual(['d1'])
  })

  it('returns an empty list for no rows', () => {
    expect(groupIdenticalDrafts([])).toEqual([])
  })
})

describe('policySuggestionMergeCount / isActionableDraft', () => {
  function asDraft(kind: AiDraft['kind'], payload: Record<string, unknown>): AiDraft {
    return {
      id: 'd1',
      kind,
      payload,
      scope: 'research',
      status: 'pending',
      generated_by: 'harness',
      linked_action_id: null,
      created_at: '2026-09-01T05:00:00Z',
      expires_at: null,
    }
  }

  it('counts only fields the merge would actually write', () => {
    const payload = {
      current_policy: { preset: 'neutral', min_hit_rate: 0.5 },
      suggestion: { preset: 'neutral', min_hit_rate: 0.7 },
    }
    // preset is proposed but identical — it writes nothing.
    expect(policySuggestionMergeCount(payload)).toBe(1)
  })

  it('reports zero when the model proposed nothing whitelist-eligible', () => {
    // The eight pending suggestions on 2026-09-01 all looked like this: reasoning
    // present, suggestion dict empty after whitelist filtering.
    const payload = {
      current_policy: { preset: 'neutral', max_candidates: 8 },
      suggestion: {},
      llm_reasoning: 'Stock-composite objective; option overlay enabled…',
    }
    expect(policySuggestionMergeCount(payload)).toBe(0)
    expect(isActionableDraft(asDraft('policy_suggestion', payload))).toBe(false)
  })

  it('treats a suggestion that would write a field as a real call', () => {
    const payload = {
      current_policy: { min_hit_rate: 0.5 },
      suggestion: { min_hit_rate: 0.7 },
    }
    expect(isActionableDraft(asDraft('policy_suggestion', payload))).toBe(true)
  })

  it('leaves every other decision kind actionable', () => {
    expect(isActionableDraft(asDraft('candidate_batch', { items: [] }))).toBe(true)
    expect(isActionableDraft(asDraft('hypothesis_suggestion', {}))).toBe(true)
  })

  it('never counts a recurring briefing as a call', () => {
    expect(isActionableDraft(asDraft('morning_brief', {}))).toBe(false)
    expect(isActionableDraft(asDraft('eod_verdict', {}))).toBe(false)
  })
})

/**
 * The diff table iterates POLICY_SUGGESTION_KEYS. It held five of the backend's
 * ten while claiming to mirror the whitelist, so a suggestion touching `layers`
 * or `universe_mode` rendered no row and counted as "nothing to merge" — while
 * approving it changed the trading system. A card that overstates a change gets
 * scrutinised; one that understates it gets approved.
 */
describe('policy diff covers every field approval writes', () => {
  it('shows a row for a nested group', () => {
    const rows = computePolicySuggestionRows({
      current_policy: { layers: { sepa: { min_score: 70 } } },
      suggestion: { layers: { sepa: { min_score: 65 } } },
    })
    const layers = rows.find((r) => r.key === 'layers')
    expect(layers, 'layers must appear in the diff').toBeTruthy()
    expect(layers?.changed).toBe(true)
  })

  it('counts a nested change as a change', () => {
    const payload = {
      current_policy: { universe_mode: 'sepa' },
      suggestion: { universe_mode: 'stock_composite' },
    }
    expect(policySuggestionMergeCount(payload)).toBe(1)
  })

  it('reads the current value from the snapshot rather than showing not-set', () => {
    // Without current_policy every row rendered "—", so an 8 → 10 change looked
    // like setting a field that had never been set.
    const rows = computePolicySuggestionRows({
      current_policy: { max_candidates: 8 },
      suggestion: { max_candidates: 10 },
    })
    const row = rows.find((r) => r.key === 'max_candidates')
    expect(row?.current).toBe(8)
    expect(row?.proposed).toBe(10)
  })

  it('lists exactly the fields the backend whitelist writes', () => {
    expect([...POLICY_SUGGESTION_KEYS].sort()).toEqual([
      'discovery_assist',
      'flag_filter',
      'layers',
      'max_candidates',
      'min_composite_score',
      'min_hit_rate',
      'option_overlay',
      'preset',
      'require_validate_pass',
      'universe_mode',
    ])
  })

  it('explains every field it offers', () => {
    // A knob with no help text is one the reader has to guess at.
    for (const k of POLICY_SUGGESTION_KEYS) {
      expect(POLICY_FIELD_HELP[k], k).toBeTruthy()
    }
  })
})
