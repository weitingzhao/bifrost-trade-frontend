import { describe, expect, it } from 'vitest'
import { draftLinks } from './draftText'
import { objectivePath } from './objectivePolicy'

describe('draftLinks', () => {
  it('links a batch and a policy suggestion to the objective they belong to', () => {
    expect(draftLinks({ kind: 'candidate_batch', payload: { objective_id: 'obj-daily-loop-stock', run_id: 'run_1' } })).toEqual([
      { label: 'Objective', to: objectivePath('obj-daily-loop-stock') },
    ])
    expect(draftLinks({ kind: 'policy_suggestion', payload: { objective_id: 'obj-daily-loop-stock' } })).toEqual([
      { label: 'Objective', to: objectivePath('obj-daily-loop-stock') },
    ])
  })

  it('links a playbook note to the curator run it came out of', () => {
    // DEV 2026-09-13: source_session_id carries the run id.
    const links = draftLinks({ kind: 'playbook_note', payload: { source_session_id: 'run_1a090a957b50a0c09', tags: [] } })
    expect(links.map((l) => l.label)).toEqual(['Source run'])
    expect(links[0].to).toContain('run=run_1a090a957b50a0c09')
    // A chat session id is not a run.
    expect(draftLinks({ kind: 'playbook_note', payload: { source_session_id: 'bca45378-19e5' } })).toEqual([])
  })

  it('offers nothing it cannot point at', () => {
    expect(draftLinks({ kind: 'decision_draft', payload: { verdict: 'avoid' } })).toEqual([])
    expect(draftLinks({ kind: 'daily_digest', payload: {} })).toEqual([])
  })
})
