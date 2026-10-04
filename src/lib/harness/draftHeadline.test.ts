import { describe, expect, it } from 'vitest'
import { draftHeadline, setupWords, splitHeadline } from './draftHeadline'

// Titles are invented in the shapes measured on DEV, not copied from it.
describe('splitHeadline (Rev .143 #4)', () => {
  it('cuts `SYM CODE — claim` into symbol, setup and claim', () => {
    expect(splitHeadline('ABCD STAGE_2A PIVOT — dealer gamma pins the range')).toEqual({
      sym: 'ABCD',
      setup: 'Stage 2A pivot',
      objective: null,
      title: 'Dealer gamma pins the range',
    })
  })

  it('cuts `SYM: claim`', () => {
    expect(splitHeadline('WXYZ: 100 holds as support')).toEqual({ sym: 'WXYZ', setup: null, objective: null, title: '100 holds as support' })
  })

  it('cuts the loop’s own `<objective> · SYM (run_…) — claim`, which the prototype mangles', () => {
    expect(splitHeadline('Some Loop Explorer · QRS (run_1a0abc) — TRACKING, falsification fails')).toEqual({
      sym: 'QRS',
      setup: null,
      objective: 'Some Loop Explorer',
      title: 'TRACKING, falsification fails',
    })
  })

  it('keeps the objective as the title when the loop wrote no claim', () => {
    expect(splitHeadline('Some Loop Explorer · QRS (run_1a0abc)')).toEqual({
      sym: 'QRS',
      setup: null,
      objective: null,
      title: 'Some Loop Explorer',
    })
    expect(splitHeadline('Morning Watch · TUV').sym).toBe('TUV')
  })

  it('leaves a sentence whose head is not a symbol whole', () => {
    expect(splitHeadline('Curator run 7 — nothing promoted')).toEqual({
      sym: null,
      setup: null,
      objective: null,
      title: 'Curator run 7 — nothing promoted',
    })
    expect(splitHeadline('ABCD IV extreme short').sym).toBeNull()
  })

  it('reads setup codes as words', () => {
    expect(setupWords('STAGE_2A PIVOT')).toBe('Stage 2A pivot')
    expect(setupWords('pivot tracking')).toBe('pivot tracking')
  })
})

describe('draftHeadline', () => {
  it('heads an objective patch with the objective’s name and the merged change', () => {
    const h = draftHeadline(
      {
        kind: 'policy_suggestion',
        scope: 'objective:obj-made-up',
        payload: { suggestion: { max_candidates: 5 }, current_policy: { max_candidates: 8 } },
      },
      { objectiveName: (id) => (id === 'obj-made-up' ? 'Made-up Explorer' : null) },
    )
    expect(h.title).toBe('Made-up Explorer · max_candidates 8 → 5')
  })

  it('falls back to the slug for an objective it cannot name, and says when nothing moves', () => {
    const h = draftHeadline({
      kind: 'policy_suggestion',
      scope: 'objective:obj-gone',
      payload: { suggestion: { max_candidates: 8 }, current_policy: { max_candidates: 8 } },
    })
    expect(h.title).toBe('obj-gone · no field would change')
  })

  it('heads a playbook note with its first line, not the scope', () => {
    const h = draftHeadline({ kind: 'playbook_note', scope: 'playbook', payload: { note_md: '\n## EFGH — **avoid**, risk-manage\n\nbody' } })
    expect(h).toMatchObject({ sym: 'EFGH', title: 'Avoid, risk-manage' })
  })

  it('cuts the hypothesis title a call resolves to', () => {
    const h = draftHeadline(
      { kind: 'decision_draft', scope: 'hypothesis:x', payload: { hypothesis_id: 'x' } },
      { hypothesisTitle: 'JKL STAGE_2A SETUP — breakout holds (run_1a0abc)' },
    )
    expect(h).toMatchObject({ sym: 'JKL', setup: 'Stage 2A setup', title: 'Breakout holds' })
  })
})
