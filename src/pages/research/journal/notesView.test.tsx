import { describe, expect, it } from 'vitest'
import type { JournalNote } from '@/api/research/journal'
import { groupByDay, noteDay } from './NotesView'
import { isNoteShortcut } from '@/lib/notes/noteComposer'

// Invented rows — the grouping day is New York's, not UTC's.
function note(over: Partial<JournalNote>): JournalNote {
  return {
    id: 'n',
    owner_id: 'o',
    body_md: 'x',
    page_route: '',
    page_label: '',
    refs: [],
    distilled_memory_id: null,
    created_at: '2026-09-25T12:00:00+00:00',
    updated_at: null,
    ...over,
  }
}

describe('notes group by the trading day', () => {
  it('an evening UTC stamp stays on the New York day', () => {
    // 01:30 UTC on the 26th is still the 25th in New York.
    expect(noteDay('2026-09-26T01:30:00+00:00')).toBe('2026-09-25')
    expect(noteDay('2026-09-26T14:30:00+00:00')).toBe('2026-09-26')
    expect(noteDay(null)).toBe('—')
  })

  it('keeps the API order inside each day', () => {
    const rows = [
      note({ id: 'b', created_at: '2026-09-26T15:00:00+00:00' }),
      note({ id: 'a', created_at: '2026-09-26T14:00:00+00:00' }),
      note({ id: 'z', created_at: '2026-09-25T14:00:00+00:00' }),
    ]
    const grouped = groupByDay(rows)
    expect(grouped.map(([d]) => d)).toEqual(['2026-09-26', '2026-09-25'])
    expect(grouped[0][1].map((n) => n.id)).toEqual(['b', 'a'])
  })
})

describe('⌥N', () => {
  const ev = (over: Partial<KeyboardEvent>) =>
    ({ altKey: false, metaKey: false, ctrlKey: false, shiftKey: false, code: 'KeyN', ...over }) as KeyboardEvent

  it('is alt+N alone — not with ⌘ or ⌃, and not other keys', () => {
    expect(isNoteShortcut(ev({ altKey: true }))).toBe(true)
    expect(isNoteShortcut(ev({ altKey: true, metaKey: true }))).toBe(false)
    expect(isNoteShortcut(ev({ altKey: true, code: 'KeyM' }))).toBe(false)
    expect(isNoteShortcut(ev({}))).toBe(false)
  })
})
