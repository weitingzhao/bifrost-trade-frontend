/**
 * Title-bar thread switcher (§11.2.5): Pinned, then a few Recent, New, All threads.
 *
 * The 440 reading dock has no sessions rail — grouping lives here so switching
 * does not depend on dock width. Recent is a cap, not a date filter: two
 * different days still show if they are the latest unpinned rows.
 */
import type { CopilotSessionSummary } from '@/api/researchCopilotSessions'

export const THREAD_SWITCHER_RECENT_MAX = 4

export const THREAD_SWITCHER_NEW_TITLE = 'New thread'
export const THREAD_SWITCHER_UNTITLED = 'Untitled thread'

export function threadSwitcherGroups(rows: CopilotSessionSummary[]): {
  pinned: CopilotSessionSummary[]
  recent: CopilotSessionSummary[]
} {
  const pinned: CopilotSessionSummary[] = []
  const rest: CopilotSessionSummary[] = []
  for (const row of rows) {
    if (row.pinned) pinned.push(row)
    else rest.push(row)
  }
  return { pinned, recent: rest.slice(0, THREAD_SWITCHER_RECENT_MAX) }
}

export function threadSwitcherTitle(
  sessionId: string,
  messageCount: number,
  rows: CopilotSessionSummary[],
): string {
  const hit = rows.find((r) => r.id === sessionId)
  const named = hit?.title?.trim()
  if (named) return named
  if (messageCount === 0) return THREAD_SWITCHER_NEW_TITLE
  return THREAD_SWITCHER_UNTITLED
}

export function threadSwitcherWhen(
  updatedAt: string | undefined | null,
  now: Date = new Date(),
): string | null {
  if (!updatedAt) return null
  const d = new Date(updatedAt)
  if (Number.isNaN(d.getTime())) return null
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}
