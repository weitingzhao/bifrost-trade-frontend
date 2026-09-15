import { describe, expect, it } from 'vitest'
import {
  copilotPersonaChipLabel,
  copilotPersonaForOrigin,
  copilotVisiblePersona,
} from './copilotVisiblePersona'

describe('copilotVisiblePersona', () => {
  it('defaults from origin when the thread has no active agent', () => {
    expect(copilotPersonaForOrigin('/portfolio/positions')).toBe('portfolio')
    expect(copilotPersonaForOrigin('/research/loop/harness')).toBe('loop_curator')
    expect(copilotPersonaForOrigin('/research/symbol')).toBe('analyze')
    expect(copilotPersonaForOrigin('/research/analyze/symbol')).toBe('analyze')
    expect(copilotPersonaForOrigin('/')).toBeNull()
  })

  it('prefers the live triage agent over the origin default', () => {
    expect(copilotVisiblePersona('analyze', '/portfolio/positions')).toBe('analyze')
    expect(copilotVisiblePersona(null, '/portfolio/positions')).toBe('portfolio')
  })

  it('labels in English for the chip', () => {
    expect(copilotPersonaChipLabel('loop_curator')).toBe('Loop Curator')
    expect(copilotPersonaChipLabel('portfolio')).toBe('Portfolio')
  })
})
