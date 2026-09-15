import { describe, expect, it } from 'vitest'
import type { CopilotSessionSummary } from '@/api/researchCopilotSessions'
import {
  THREAD_SWITCHER_NEW_TITLE,
  THREAD_SWITCHER_RECENT_MAX,
  THREAD_SWITCHER_UNTITLED,
  threadSwitcherGroups,
  threadSwitcherTitle,
  threadSwitcherWhen,
} from './threadSwitcher'

function row(
  id: string,
  extras: Partial<CopilotSessionSummary> = {},
): CopilotSessionSummary {
  return { id, title: id, ...extras }
}

describe('threadSwitcherGroups', () => {
  it('keeps pinned out of recent, and caps recent at 4 across different days', () => {
    const rows = [
      row('p1', { pinned: true, title: 'Pinned A', updated_at: '2026-09-13T12:00:00Z' }),
      row('p2', { pinned: true, title: 'Pinned B', updated_at: '2026-09-14T12:00:00Z' }),
      row('r1', { pinned: false, title: 'Mon', updated_at: '2026-09-14T10:00:00Z' }),
      row('r2', { pinned: false, title: 'Sun', updated_at: '2026-09-13T10:00:00Z' }),
      row('r3', { pinned: false, title: 'Sat', updated_at: '2026-09-12T10:00:00Z' }),
      row('r4', { pinned: false, title: 'Fri', updated_at: '2026-09-11T10:00:00Z' }),
      row('r5', { pinned: false, title: 'Thu', updated_at: '2026-09-10T10:00:00Z' }),
    ]
    const g = threadSwitcherGroups(rows)
    expect(g.pinned.map((r) => r.id)).toEqual(['p1', 'p2'])
    expect(g.recent.map((r) => r.id)).toEqual(['r1', 'r2', 'r3', 'r4'])
    expect(g.recent).toHaveLength(THREAD_SWITCHER_RECENT_MAX)
    // The fifth unpinned row is the one the old same-day filter would have
    // dropped or kept depending on luck — the cap must still hide it.
    expect(g.recent.map((r) => r.id)).not.toContain('r5')
  })
})

describe('threadSwitcherTitle', () => {
  it('is New thread when the open session has no messages and no saved title', () => {
    expect(threadSwitcherTitle('fresh-id', 0, [])).toBe(THREAD_SWITCHER_NEW_TITLE)
  })

  it('uses the saved title even when the thread is empty (restored then cleared)', () => {
    expect(
      threadSwitcherTitle('t1', 0, [row('t1', { title: 'PLTR · sell-vol' })]),
    ).toBe('PLTR · sell-vol')
  })

  it('is Untitled thread when the open session has messages but no saved title', () => {
    expect(threadSwitcherTitle('t1', 3, [row('t1', { title: '' })])).toBe(
      THREAD_SWITCHER_UNTITLED,
    )
    expect(threadSwitcherTitle('fresh-id', 2, [])).toBe(THREAD_SWITCHER_UNTITLED)
  })
})

describe('threadSwitcherWhen', () => {
  it('returns null when there is no timestamp, not a guessed clock', () => {
    expect(threadSwitcherWhen(null)).toBeNull()
    expect(threadSwitcherWhen(undefined)).toBeNull()
    expect(threadSwitcherWhen('not-a-date')).toBeNull()
  })

  it('prints HH:MM on the same calendar day as now', () => {
    const now = new Date('2026-09-14T18:00:00')
    const s = threadSwitcherWhen('2026-09-14T09:38:00', now)
    expect(s).toMatch(/^\d{2}:\d{2}$/)
  })
})
