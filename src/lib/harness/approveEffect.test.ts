import { describe, expect, it } from 'vitest'
import type { AiDraft } from '@/api/researchDrafts'
import { approveEffect } from './draftText'

const draft = (kind: string, payload: Record<string, unknown> = {}, scope = '') =>
  ({ kind, payload, scope }) as Pick<AiDraft, 'kind' | 'payload' | 'scope'>

describe('approveEffect', () => {
  it('says an EOD verdict sets its hypothesis, only when the server would', () => {
    expect(approveEffect(draft('eod_verdict', { hypothesis_id: 'h1', proposed_status: 'validated' }))).toMatchObject({
      label: 'Hypothesis → validated',
      to: '/research/loop/hypotheses',
    })
    // The server falls back to the draft's scope for the hypothesis.
    expect(approveEffect(draft('eod_verdict', { proposed_status: 'active' }, 'hyp-2'))?.label).toBe('Hypothesis → active')
    // A status it does not write, or nothing to write it on: Approve writes nothing.
    expect(approveEffect(draft('eod_verdict', { hypothesis_id: 'h1', proposed_status: 'keep' }))).toBeNull()
    expect(approveEffect(draft('eod_verdict', { proposed_status: 'rejected' }))).toBeNull()
  })

  it('says a morning brief creates a hypothesis only when it asks to and can', () => {
    expect(approveEffect(draft('morning_brief', { create_hypothesis: true, title: 'PAYS pivot', thesis: 'SEPA A, rising volume' }))?.label).toBe(
      'Hypothesis Board',
    )
    expect(approveEffect(draft('morning_brief', { create_hypothesis: true, title: 'PAYS pivot' }))).toBeNull()
    expect(approveEffect(draft('morning_brief', { bullets: ['no material change'] }))).toBeNull()
  })

  it('counts the fields a policy suggestion would merge, and says nothing when none change', () => {
    expect(approveEffect(draft('policy_suggestion', { current_policy: { max_candidates: 8 }, suggestion: { max_candidates: 6 } }))).toMatchObject({
      label: 'Autopilot objective',
      detail: "merges 1 field into the objective's policy",
    })
    expect(approveEffect(draft('policy_suggestion', { current_policy: { max_candidates: 8 }, suggestion: { max_candidates: 8 } }))).toBeNull()
  })

  it('names the writing kinds and leaves the pass-through ones empty', () => {
    expect(approveEffect(draft('candidate_batch'))?.label).toBe('Candidate Pool · Hypothesis Board')
    expect(approveEffect(draft('playbook_note'))?.detail).toBe('adds this note to your trading system')
    expect(approveEffect(draft('decision_draft', { verdict: 'avoid' }))).toBeNull()
    expect(approveEffect(draft('daily_digest'))).toBeNull()
  })
})
