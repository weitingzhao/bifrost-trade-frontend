import { describe, expect, it } from 'vitest'
import {
  copilotPersonaChipLabel,
  copilotPersonaChipSource,
  copilotPersonaChipText,
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

  it('labels a default chip as default, not as who answered', () => {
    expect(copilotPersonaChipSource(null)).toBe('default')
    expect(copilotPersonaChipSource('  ')).toBe('default')
    expect(copilotPersonaChipSource('portfolio')).toBe('triage')
    expect(copilotPersonaChipText('portfolio', 'default')).toBe('default · Portfolio')
    expect(copilotPersonaChipText('portfolio', 'triage')).toBe('as Portfolio')
    expect(copilotPersonaChipLabel('loop_curator')).toBe('Loop Curator')
  })
})
