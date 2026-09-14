import { describe, expect, it } from 'vitest'
import type { PersistedCopilotFrame } from '@/api/researchCopilotSessions'
import { threadInFilter, threadPersona, threadTurns, threadWriteCount } from './threadRows'

const frame = (agent?: string, kind = 'text'): PersistedCopilotFrame => ({ kind, role: agent ? 'assistant' : 'user', agent })

describe('threadPersona', () => {
  it('names the specialist a thread was handed to, not the triage that passed it on', () => {
    // DEV, 2026-09: a pre-market brief handed from triage to portfolio; a run review to verdict.
    expect(threadPersona([frame(), frame('triage'), frame('portfolio'), frame('portfolio')])).toEqual(['portfolio'])
    expect(threadPersona([frame(), frame('triage'), frame('verdict'), frame('triage')])).toEqual(['verdict'])
  })

  it('is triage when triage answered alone', () => {
    expect(threadPersona([frame(), frame('triage', 'tool_call'), frame('triage')])).toEqual(['triage'])
  })

  it('is nobody when no agent spoke — the question is the only frame', () => {
    // The 2026-09-08 "hello" threads on claude-4.5-sonnet, which DEV has no key for.
    expect(threadPersona([frame()])).toBeNull()
    expect(threadPersona([])).toBeNull()
  })
})

describe('threadTurns', () => {
  it('counts questions, not frames', () => {
    const frames = [frame(), frame('triage', 'tool_call'), { kind: 'tool_result' }, frame('triage'), frame(), frame('portfolio', 'handoff')]
    expect(threadTurns(frames)).toBe(2)
    expect(threadTurns([])).toBe(0)
  })
})

describe('threadInFilter', () => {
  it('counts a thread as today by its ET date, not its UTC one', () => {
    // 03:30 UTC on the 14th is 23:30 ET on the 13th.
    expect(threadInFilter({ updated_at: '2026-09-14T03:30:00Z' }, 'today', '2026-09-13')).toBe(true)
    expect(threadInFilter({ updated_at: '2026-09-14T03:30:00Z' }, 'today', '2026-09-14')).toBe(false)
    expect(threadInFilter({}, 'today', '2026-09-13')).toBe(false)
  })

  it('keeps pinned threads under Pinned and everything under All', () => {
    expect(threadInFilter({ pinned: true }, 'pinned', '2026-09-13')).toBe(true)
    expect(threadInFilter({ pinned: false }, 'pinned', '2026-09-13')).toBe(false)
    expect(threadInFilter({ pinned: false }, 'all', '2026-09-13')).toBe(true)
  })

  it('filters With writes by the summary writes map', () => {
    expect(threadInFilter({ writes: { proposed: 1 } }, 'with_writes', '2026-09-13')).toBe(true)
    expect(threadInFilter({ writes: {} }, 'with_writes', '2026-09-13')).toBe(false)
    expect(threadWriteCount({ writes: { proposed: 2, executed: 1 } })).toBe(3)
  })
})
