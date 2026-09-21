import { describe, expect, it } from 'vitest'
import { threadPersona } from './threadPersona'
import {
  copilotPersonaChipSource,
  copilotPersonaChipText,
  copilotVisiblePersona,
} from './copilotVisiblePersona'

describe('threadPersona', () => {
  it('names the specialists that spoke, triage only when it answered alone', () => {
    expect(threadPersona([{}, { agent: 'triage' }, { agent: 'portfolio' }])).toEqual(['portfolio'])
    expect(threadPersona([{ agent: 'triage' }, { agent: 'triage' }])).toEqual(['triage'])
  })

  it('answers null when nobody spoke — a thread that is only its question', () => {
    expect(threadPersona([{}, {}])).toBeNull()
    expect(threadPersona([])).toBeNull()
  })
})

describe('the dock’s persona chip', () => {
  it('prefers the live agent, then who answered, then the page default', () => {
    expect(copilotVisiblePersona('verdict', '/portfolio', 'analyze')).toBe('verdict')
    // An opened thread has no live agent; until 2026-09-21 the header said
    // nothing at all on one, while the Threads table had known all along.
    expect(copilotVisiblePersona(null, '/research/copilot', 'analyze')).toBe('analyze')
    expect(copilotVisiblePersona(null, '/portfolio', null)).toBe('portfolio')
    expect(copilotVisiblePersona(null, '/research/copilot', null)).toBeNull()
  })

  it('says «as» for an answer and «default» for a guess', () => {
    expect(copilotPersonaChipSource(null, 'analyze')).toBe('answered')
    expect(copilotPersonaChipSource('verdict', 'analyze')).toBe('triage')
    expect(copilotPersonaChipSource(null, null)).toBe('default')
    expect(copilotPersonaChipText('analyze', 'answered')).toMatch(/^as /)
    expect(copilotPersonaChipText('analyze', 'default')).toMatch(/^default · /)
  })
})
