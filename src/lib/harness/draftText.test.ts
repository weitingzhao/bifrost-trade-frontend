import { describe, expect, it } from 'vitest'
import { draftAskedBy, draftLandsIn, draftTitle, kindTag } from './draftText'
import { APPROVE_WRITES_KINDS, isDecisionKind } from './harnessDraftHelpers'

describe('kindTag', () => {
  it('draws five words for the five places Approve writes (Rev .143)', () => {
    expect(kindTag('candidate_batch')).toBe('candidates')
    expect(kindTag('decision_draft')).toBe('call')
    // `vehicle` left the tag in Rev .143 — a verdict and its vehicle are one call.
    expect(kindTag('order_intent')).toBe('call')
    expect(kindTag('hypothesis_draft')).toBe('hypothesis')
    expect(kindTag('hypothesis_suggestion')).toBe('hypothesis')
    expect(kindTag('playbook_rule')).toBe('rule')
    // Owner 2026-10-04 #10: a playbook note files beside the rules.
    expect(kindTag('playbook_note')).toBe('rule')
    expect(kindTag('rule')).toBe('rule')
    expect(kindTag('some_future_kind')).toBe('some future kind')
  })

  it('splits a policy suggestion by scope: an objective policy is a patch', () => {
    expect(kindTag('policy_suggestion', 'objective:obj-a')).toBe('patch')
    expect(kindTag('policy_suggestion', 'opportunity:O1')).toBe('rule')
    expect(kindTag('policy_suggestion')).toBe('rule')
  })

  it('keeps every decision kind to the five lowercase words', () => {
    const known = ['candidate_batch', 'policy_suggestion', 'playbook_rule', 'playbook_note',
      'decision_draft', 'order_intent', 'hypothesis_suggestion', 'hypothesis_draft']
    const five = new Set(['rule', 'patch', 'hypothesis', 'candidates', 'call'])
    for (const kind of known) {
      expect(five.has(kindTag(kind, 'objective:x')), kind).toBe(true)
      expect(five.has(kindTag(kind, 'global')), kind).toBe(true)
    }
  })

  it('names briefings in lowercase words, outside the five', () => {
    expect(kindTag('eod_verdict')).toBe('eod verdict')
    expect(kindTag('daily_digest')).toBe('daily digest')
    expect(kindTag('morning_brief')).toBe('morning brief')
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
    // The prototype says an order intent lands in Trading › Plans. On the server
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
