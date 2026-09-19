import { describe, expect, it } from 'vitest'
import { operatorOf, sourceOperatorOf } from './operatorOf'

describe('operatorOf', () => {
  it('reads the loop off its own birthplaces', () => {
    expect(operatorOf('candidate_batch_approve')).toBe('loop')
    expect(operatorOf('harness')).toBe('loop')
    expect(operatorOf('loop_curator')).toBe('loop')
  })

  it('reads the copilot off the chat and agent birthplaces', () => {
    expect(operatorOf('cockpit_inbox')).toBe('copilot')
    expect(operatorOf('morning_brief')).toBe('copilot')
    expect(operatorOf('hypothesis_suggestion')).toBe('copilot')
  })

  it('defaults to the hand — machine writers stamp their origin, people do not', () => {
    expect(operatorOf('analyze-scan')).toBe('hand')
    expect(operatorOf('/research/symbol')).toBe('hand')
    expect(operatorOf(null)).toBe('hand')
    expect(operatorOf('')).toBe('hand')
  })
})

describe('sourceOperatorOf', () => {
  it("follows the design's own rule: YOU → hand, CURATOR → loop, screen → hand", () => {
    expect(sourceOperatorOf('you')).toBe('hand')
    expect(sourceOperatorOf('curator')).toBe('loop')
    expect(sourceOperatorOf('screen')).toBe('hand')
    expect(sourceOperatorOf('scan')).toBe('hand')
  })

  it('reads loop sources by token, not by an exact list', () => {
    expect(sourceOperatorOf('loop_curator')).toBe('loop')
    expect(sourceOperatorOf('objective:obj-daily-stock')).toBe('loop')
  })
})
