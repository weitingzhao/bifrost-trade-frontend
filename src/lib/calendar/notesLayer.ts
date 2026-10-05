/**
 * Calendar · Notes (past) — the Owner's Journal notes (`/research/journal/notes`,
 * keyed by the research user), the read Journal › Notes makes unfiltered — the
 * same key, so the two share a cache.
 *
 * The store is real and, measured 2026-10-04, empty: `journal.note` holds no
 * row. An empty layer here says that, not "no data". Day: New York, from
 * `created_at`. Opens Journal › Notes.
 */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchNotes, type JournalNote } from '@/api/research/journal'
import { layerStateOf, type CalendarItem, type CalendarLayerReading } from './calendarLayers'
import { nyDayOf } from './decisionsLayer'

/** Journal › Notes' own key with no search and no ref filter. */
const NOTES_UNFILTERED = ['research-engine', 'journal', 'notes', '', '', ''] as const

function firstLine(md: string): string {
  const line = md.split('\n').map((l) => l.replace(/^#+\s*/, '').trim()).find(Boolean) ?? ''
  return line.length > 120 ? `${line.slice(0, 119)}…` : line
}

export function noteItems(notes: readonly JournalNote[]): CalendarItem[] {
  const out: CalendarItem[] = []
  for (const n of notes) {
    const d = nyDayOf(n.created_at)
    if (!d) continue
    out.push({
      key: `notes:${n.id}`,
      d,
      layer: 'notes',
      cell: '',
      text: firstLine(n.body_md) || '(empty note)',
      syms: n.refs.filter((r) => r.type === 'sym').map((r) => r.id.toUpperCase()),
      ink: 'soft',
      to: '/research/journal?view=notes',
    })
  }
  return out.sort((a, b) => a.d.localeCompare(b.d))
}

export function useCalendarNotes(): CalendarLayerReading {
  const q = useQuery({
    queryKey: NOTES_UNFILTERED,
    queryFn: () => fetchNotes({ limit: 300 }),
    staleTime: 30_000,
  })
  const items = useMemo(() => noteItems(q.data?.notes ?? []), [q.data?.notes])
  const state = layerStateOf([q])
  return {
    layer: 'notes',
    items,
    state,
    floor: (q.data?.notes.length ?? 0) >= 300,
    note:
      state === 'signed-out'
        ? 'Notes are keyed by the research user — sign in to read them.'
        : state === 'ready' && items.length === 0
          ? 'No note has been written yet — the store is empty, not unread.'
          : state === 'failed'
            ? 'The notes read failed — nothing was placed.'
            : null,
  }
}
