/**
 * Remove now, write later (design Rev .75/.79: Dismiss · Drop · Cancel with
 * Undo). For a removal the server has no way back from: the row leaves the
 * list at once, the toast offers Undo for 5s, and the write goes out only
 * when the toast leaves without it (`notifyHeld`). Undo puts the row back
 * and nothing was ever sent.
 *
 * The held ids live in one store rather than in the page, so leaving the
 * page and coming back inside the 5s does not bring the row back early. If
 * the write fails the row comes back and the toast says so.
 */
import { useCallback } from 'react'
import type { QueryKey } from '@tanstack/react-query'
import { createExternalStore } from '@/lib/cockpit/externalStore'
import { queryClient } from '@/lib/queryClient'
import { notify, notifyHeld } from '@/lib/shellNotify'

const heldStore = createExternalStore<{ held: ReadonlySet<string> }>({ held: new Set() })

function setHeld(keys: string[], on: boolean): void {
  heldStore.setState((s) => {
    const next = new Set(s.held)
    for (const k of keys) {
      if (on) next.add(k)
      else next.delete(k)
    }
    return { held: next }
  })
}

export interface HoldOptions {
  /** The toast: what was done, in the page's own word ("Dismissed …"). */
  msg: string
  /** The write, sent when the toast leaves without Undo. */
  commit: () => Promise<unknown>
  /** Refetched after the write lands, so the row leaves the data too. */
  invalidate?: QueryKey[]
  /** Said if the write fails; the row is back by then. */
  failed?: string
}

/**
 * `scope` keeps one store's held ids apart from another's — the same scope on
 * every surface that lists that store, so a row held on one is gone from all.
 * Returns whether an id is held (filter the list with it) and `hold` to
 * remove one or several under a single toast.
 */
export function useHeldRemoval(scope: string) {
  const { held } = heldStore.useStore()
  const isHeld = useCallback((id: string | number) => held.has(`${scope}:${id}`), [held, scope])
  const hold = useCallback(
    (ids: string | number | readonly (string | number)[], o: HoldOptions) => {
      const list = typeof ids === 'string' || typeof ids === 'number' ? [ids] : ids
      const keys = list.map((id) => `${scope}:${id}`)
      setHeld(keys, true)
      notifyHeld(o.msg, {
        undo: () => setHeld(keys, false),
        commit: () => {
          void o
            .commit()
            .then(async () => {
              await Promise.all((o.invalidate ?? []).map((k) => queryClient.invalidateQueries({ queryKey: k })))
              setHeld(keys, false)
            })
            .catch((e: unknown) => {
              setHeld(keys, false)
              notify(`${o.failed ?? 'Could not save that'} — ${e instanceof Error ? e.message : String(e)}`)
            })
        },
      })
    },
    [scope],
  )
  return { isHeld, hold }
}
