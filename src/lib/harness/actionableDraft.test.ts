/**
 * Which drafts are calls.
 *
 * Its own file for two reasons: it is one subject — whether a draft's Approve
 * writes anything, per `apply_draft_approval` in bifrost-research — and the
 * helpers' test file crossed the 800-line ratchet when the pass-through cases
 * were added.
 */
import { describe, expect, it } from 'vitest'
import type { AiDraft } from '@/api/researchDrafts'
import { isActionableDraft, isDecisionKind, policySuggestionMergeCount } from './harnessDraftHelpers'

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

  it('counts a kind as a call only when its Approve writes something', () => {
    expect(isActionableDraft(asDraft('candidate_batch', { items: [] }))).toBe(true)
    expect(isActionableDraft(asDraft('playbook_rule', {}))).toBe(true)
    expect(isActionableDraft(asDraft('playbook_note', {}))).toBe(true)
  })

  it('does not promote Approve for a kind the server passes through', () => {
    // `apply_draft_approval` has no branch for these; its `else` only flips the
    // status. This block used to assert that hypothesis_suggestion was a call.
    const passThrough = ['order_intent', 'decision_draft', 'hypothesis_suggestion', 'hypothesis_draft'] as const
    for (const kind of passThrough) {
      expect(isActionableDraft(asDraft(kind, {})), kind).toBe(false)
      // Still shown — muted, not dropped.
      expect(isDecisionKind(kind), kind).toBe(true)
    }
  })

  it('shows a kind it does not model, but does not promote it', () => {
    const unknown = asDraft('some_future_kind' as AiDraft['kind'], {})
    expect(isDecisionKind(unknown.kind)).toBe(true)
    expect(isActionableDraft(unknown)).toBe(false)
  })

  it('never counts a recurring briefing as a call', () => {
    expect(isActionableDraft(asDraft('morning_brief', {}))).toBe(false)
    expect(isActionableDraft(asDraft('eod_verdict', {}))).toBe(false)
  })
})
