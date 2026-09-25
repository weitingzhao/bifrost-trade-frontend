/**
 * The objective the shell is looking through — provenance as a scope.
 *
 * The Owner's ruling (design 2026-09-20, Vision §16): an objective is an
 * instance, like a symbol is, and the mechanism is a **scope, not a menu
 * entry**. The menu has no NVDA on it; it has Symbol, the place. The same is
 * true here — Autopilot has Console and Inbox, and *which machine* is a lens
 * laid over them.
 *
 * Unlike the symbol, this does not live in the URL. A symbol is what a page is
 * *about*; an objective is a filter carried across pages that are about other
 * things, and putting it in every URL would make every deep link carry a
 * filter its recipient never chose. It lives in `localStorage` so it survives
 * a reload, and a broadcast keeps every reader in step — a control that shows
 * a scope must never be the one surface that disagrees with it.
 *
 * `all` is not an objective: it is the absence of the filter, and it is the
 * default, because a shell that silently starts filtered is a shell that
 * hides rows.
 */
import { useCallback, useEffect, useState } from 'react'
import type { ResearchCandidate } from '@/api/research/candidates'

const STORAGE_KEY = 'bifrost.objective'
const EVENT = 'bifrost:objective'

/** No filter. Every row, whatever produced it. */
export const ALL_OBJECTIVES = 'all'

export function readObjective(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || ALL_OBJECTIVES
  } catch {
    return ALL_OBJECTIVES
  }
}

export function setObjective(id: string | null | undefined) {
  const next = id && id !== ALL_OBJECTIVES ? id : ALL_OBJECTIVES
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // private mode / quota — the scope still applies for this render
  }
  try {
    window.dispatchEvent(new CustomEvent(EVENT, { detail: next }))
  } catch {
    // no window (tests, SSR)
  }
}

/**
 * The current objective, kept in step across every component that asks.
 *
 * `storage` is listened to as well as the custom event so a second tab that
 * changes the scope does not leave this one showing a stale lens.
 */
export function useObjectiveScope(): { objective: string; isAll: boolean; select: (id: string) => void } {
  const [objective, setLocal] = useState(readObjective)

  useEffect(() => {
    const sync = () => setLocal(readObjective())
    window.addEventListener(EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const select = useCallback((id: string) => {
    setObjective(id)
    setLocal(id && id !== ALL_OBJECTIVES ? id : ALL_OBJECTIVES)
  }, [])

  return { objective, isAll: objective === ALL_OBJECTIVES, select }
}

/**
 * A candidate row's objective, when the harness stamped one. Read by the
 * objective's own pages, the review chain and the shell's Symbol list.
 */
export function candidateObjectiveId(row: Pick<ResearchCandidate, 'source_ref'>): string | null {
  const ref = row.source_ref
  if (!ref || typeof ref !== 'object') return null
  const id = (ref as Record<string, unknown>).objective_id
  return typeof id === 'string' && id ? id : null
}
