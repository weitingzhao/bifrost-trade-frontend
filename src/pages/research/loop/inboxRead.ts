/**
 * Which briefings you have read — per viewer, in this browser.
 *
 * The design gives every agent post a "mark read" and counts unread briefings
 * ("3 unread briefings"), and the digest strip goes away once the digest is
 * read. The Research service keeps no read state: a draft is pending,
 * approved, dismissed or expired, and reading one is none of those. So the set
 * lives in localStorage — another browser starts with everything unread — and
 * is pruned to drafts still pending, so it does not grow for ever.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { STORAGE_KEYS } from '@/constants/storage'

/** The stored set, tolerating anything that is not a JSON list of strings. */
export function parseReadIds(raw: string | null): Set<string> {
  if (!raw) return new Set()
  try {
    const parsed: unknown = JSON.parse(raw)
    return new Set(Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [])
  } catch {
    return new Set()
  }
}

/** Only the ids still pending. A read draft that was since approved or dismissed has nothing left to mark. */
export function pruneReadIds(read: ReadonlySet<string>, pendingIds: readonly string[]): Set<string> {
  const pending = new Set(pendingIds)
  return new Set([...read].filter((id) => pending.has(id)))
}

export function unreadCount(ids: readonly string[], read: ReadonlySet<string>): number {
  return ids.filter((id) => !read.has(id)).length
}

function load(): Set<string> {
  try {
    return parseReadIds(localStorage.getItem(STORAGE_KEYS.inboxReadDrafts))
  } catch {
    return new Set()
  }
}

function save(read: ReadonlySet<string>): void {
  try {
    localStorage.setItem(STORAGE_KEYS.inboxReadDrafts, JSON.stringify([...read]))
  } catch {
    // A browser that refuses storage still lets you mark read for this visit.
  }
}

export function useReadDrafts(pendingIds: readonly string[] | null) {
  const [read, setReadState] = useState<Set<string>>(load)

  // Prune only against a full answer: a narrowed or loading list would drop
  // every id it did not happen to contain. The page sees the pruned set; the
  // effect only writes it back to storage — a write, not a state update, so a
  // render never loops through it.
  const pendingKey = pendingIds ? pendingIds.join(',') : null
  const current = useMemo(
    () => (pendingIds ? pruneReadIds(read, pendingIds) : read),
    // pendingKey stands in for the array's contents.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [read, pendingKey],
  )
  useEffect(() => {
    if (current.size < read.size) save(current)
  }, [current, read])

  const setRead = useCallback((id: string, isRead: boolean) => {
    setReadState((prev) => {
      if (prev.has(id) === isRead) return prev
      const next = new Set(prev)
      if (isRead) next.add(id)
      else next.delete(id)
      save(next)
      return next
    })
  }, [])

  return { read: current, setRead }
}
