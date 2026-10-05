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
import { useCallback, useEffect, useMemo } from 'react'
import { STORAGE_KEYS } from '@/constants/storage'
import { createExternalStore } from '@/lib/cockpit/externalStore'

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

type StoredKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]

function load(key: StoredKey): Set<string> {
  try {
    return parseReadIds(localStorage.getItem(key))
  } catch {
    return new Set()
  }
}

function save(key: StoredKey, ids: ReadonlySet<string>): void {
  try {
    localStorage.setItem(key, JSON.stringify([...ids]))
  } catch {
    // A browser that refuses storage still keeps the set for this visit.
  }
}

type StoredSet = ReturnType<typeof createExternalStore<{ ids: Set<string> }>>

/**
 * One store per key, so every reader of a set sees the same one: the Decision
 * Inbox and the Copilot's waiting queue both fold the earlier runs you hid,
 * and a hide on one has to take the card off the other at once rather than at
 * its next mount.
 */
const stores = new Map<StoredKey, StoredSet>()

function storeFor(key: StoredKey): StoredSet {
  let s = stores.get(key)
  if (!s) {
    s = createExternalStore<{ ids: Set<string> }>({ ids: load(key) })
    stores.set(key, s)
  }
  return s
}

/** Tests only: forget every set read so far, so the next read comes from storage. */
export function resetStoredDraftIds(): void {
  stores.clear()
}

/**
 * A set of draft ids kept in this browser, pruned to the drafts still pending.
 *
 * Two sets live this way: the briefings you marked read, and the earlier runs
 * you hid under their card (`Dismiss earlier`, Owner 2026-10-04 #11 — local,
 * nothing is sent).
 */
export function useStoredDraftIds(key: StoredKey, pendingIds: readonly string[] | null) {
  const store = storeFor(key)
  const { ids } = store.useStore()

  // Prune only against a full answer: a narrowed or loading list would drop
  // every id it did not happen to contain. The page sees the pruned set; the
  // effect only writes it back to storage — a write, not a state update, so a
  // render never loops through it.
  const pendingKey = pendingIds ? pendingIds.join(',') : null
  const current = useMemo(
    () => (pendingIds ? pruneReadIds(ids, pendingIds) : ids),
    // pendingKey stands in for the array's contents.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ids, pendingKey],
  )
  useEffect(() => {
    if (current.size < ids.size) save(key, current)
  }, [current, ids, key])

  const setMany = useCallback(
    (list: readonly string[], on: boolean) => {
      store.setState((prev) => {
        if (list.every((id) => prev.ids.has(id) === on)) return prev
        const next = new Set(prev.ids)
        for (const id of list) {
          if (on) next.add(id)
          else next.delete(id)
        }
        save(key, next)
        return { ids: next }
      })
    },
    [key, store],
  )

  return { ids: current, setMany }
}

/** The earlier runs hidden under their card, in this browser (Owner 2026-10-04 #11). */
export function useHiddenEarlier(pendingIds: readonly string[] | null) {
  return useStoredDraftIds(STORAGE_KEYS.inboxHiddenEarlier, pendingIds)
}

export function useReadDrafts(pendingIds: readonly string[] | null) {
  const { ids, setMany } = useStoredDraftIds(STORAGE_KEYS.inboxReadDrafts, pendingIds)
  const setRead = useCallback((id: string, isRead: boolean) => setMany([id], isRead), [setMany])
  return { read: ids, setRead }
}
