import { describe, it, expect } from 'vitest'
import { JUDGE_MODEL_CHOICES, judgeCountWarning } from './judgeModels'

describe('choosing the judges for one run', () => {
  it('offers the two the cluster actually runs', () => {
    expect(JUDGE_MODEL_CHOICES.map((c) => c.model)).toEqual(['deepseek-chat', 'gpt-4o-mini'])
    // The blurb has to say where the money goes, because that is the whole
    // reason the choice is offered.
    expect(JUDGE_MODEL_CHOICES[0].blurb).toContain('most of the bill')
  })

  it('warns that a lone judge cannot agree with itself', () => {
    // The leash accepts only on agreement, so judge count is not a quality
    // dial — below two it decides that nothing can ever be accepted.
    expect(judgeCountWarning(1)).toContain('cannot disagree with itself')
    expect(judgeCountWarning(0)).toContain('every candidate is held')
    expect(judgeCountWarning(2)).toBeNull()
    expect(judgeCountWarning(3)).toBeNull()
  })
})
