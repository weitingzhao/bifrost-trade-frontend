import { describe, expect, it } from 'vitest'
import { draftAskedBy, draftKindLabel, draftLandsIn, draftTitle } from './draftText'
import { APPROVE_WRITES_KINDS, isDecisionKind } from './harnessDraftHelpers'

describe('draftKindLabel', () => {
  it('names the kinds it models and passes the rest through', () => {
    expect(draftKindLabel('candidate_batch')).toBe('Candidate Batch')
    expect(draftKindLabel('policy_suggestion')).toBe('Policy Suggestion')
    expect(draftKindLabel('decision_draft')).toBe('Decision')
    // `vehicle` since the design's Rev 2026-09-22.7 ruling — the card draws a
    // shape for expressing a belief, and it never reaches Trade.
    expect(draftKindLabel('order_intent')).toBe('vehicle')
    expect(draftKindLabel('some_future_kind')).toBe('some_future_kind')
  })

  it('names every decision kind the server knows', () => {
    // No snake_case in a column called Kind for anything the backend accepts.
    const known = ['candidate_batch', 'policy_suggestion', 'playbook_rule', 'playbook_note',
      'decision_draft', 'order_intent', 'hypothesis_suggestion', 'hypothesis_draft']
    for (const kind of known) expect(draftKindLabel(kind), kind).not.toMatch(/_/)
  })
})

describe('draftTitle', () => {
  it('prefers the title, then the hypothesis, then the scope', () => {
    expect(draftTitle({ payload: { title: 'T', hypothesis_title: 'H' }, scope: 's' })).toBe('T')
    expect(draftTitle({ payload: { hypothesis_title: 'H' }, scope: 's' })).toBe('H')
    expect(draftTitle({ payload: {}, scope: 'global' })).toBe("Today's Discoveries")
    expect(draftTitle({ payload: { title: '' }, scope: 'objective:x' })).toBe('objective:x')
  })
})

describe('draftAskedBy', () => {
  it('reads the writer as words, and an Owner draft as you', () => {
    expect(draftAskedBy('owner:owner')).toBe('you')
    expect(draftAskedBy('weekly_policy_review')).toBe('weekly policy review')
    expect(draftAskedBy('harness')).toBe('harness')
    expect(draftAskedBy('')).toBe('unattributed')
    expect(draftAskedBy(null)).toBe('unattributed')
  })
})

describe('draftLandsIn', () => {
  it('names a destination for every kind whose Approve writes', () => {
    // The two tables describe one fact — what the server's approve does — and
    // this fails the moment they disagree.
    for (const kind of APPROVE_WRITES_KINDS) {
      expect(draftLandsIn(kind), kind).not.toBeNull()
    }
  })

  it('names none for a kind the server passes through', () => {
    // The prototype says an order intent lands in Trade › Plans. On the server
    // its approval only changes its status.
    for (const kind of ['order_intent', 'decision_draft', 'hypothesis_suggestion', 'hypothesis_draft']) {
      expect(isDecisionKind(kind), kind).toBe(true)
      expect(APPROVE_WRITES_KINDS.has(kind), kind).toBe(false)
      expect(draftLandsIn(kind), kind).toBeNull()
    }
  })
})

const scoped = { payload: {}, scope: 'hypothesis:intc-stage-2a-setup-perfect-technique-thin-funda-5140a1e0be' }

describe('draftTitle · the hypothesis join', () => {
  it('heads the card with the belief, not the slug', () => {
    expect(draftTitle(scoped, 'INTC STAGE_2A SETUP — perfect technique, thin fundamental')).toBe(
      'INTC STAGE_2A SETUP — perfect technique, thin fundamental',
    )
  })

  // Provenance, and the card carries it on its own line. Left in, every title
  // on the page ended in forty characters of hex.
  it('drops a trailing run id', () => {
    expect(draftTitle(scoped, 'ANET STAGE_2A PIVOT — tape not paying (run_1a0c94f361039007f)')).toBe(
      'ANET STAGE_2A PIVOT — tape not paying',
    )
  })

  it('keeps the payload title when the draft has one of its own', () => {
    expect(draftTitle({ payload: { title: 'Daily Loop Stock Explorer' }, scope: 'x' }, 'ignored')).toBe(
      'Daily Loop Stock Explorer',
    )
  })

  // The join is a lookup, and a lookup can miss. Falling back to the scope is
  // the behaviour that was there before — worse to read, never wrong.
  it('falls back to the scope when the hypothesis is not in the list', () => {
    expect(draftTitle(scoped, null)).toBe(scoped.scope)
    expect(draftTitle(scoped, '   ')).toBe(scoped.scope)
    expect(draftTitle(scoped, '(run_1a0c94f361039007f)')).toBe(scoped.scope)
  })

  it('still names the global digest', () => {
    expect(draftTitle({ payload: {}, scope: 'global' })).toBe("Today's Discoveries")
  })
})
