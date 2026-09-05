/**
 * Where "tight" starts, on the short-leg cushion.
 *
 * It began as a constant, which made it a claim about how this book is traded
 * rather than a setting the person trading it owns. A seller running weeklies
 * and one running 45-day cycles do not share a warning line, and the number is
 * only useful if it can be moved while looking at the column it colours.
 *
 * Local to the browser on purpose: it is a display threshold, not a position or
 * a rule, so it does not earn a database column or a trip through the API.
 *
 * Backed by an external store rather than component state. The first version used
 * `useState`, and because the toolbar and the table each call this hook, they got
 * two independent copies — the control moved, the value persisted, and the column
 * it was meant to recolour did not change. One warning line has to be one value.
 */
import { useCallback } from 'react'
import { useSyncExternalStore } from 'react'
import { STORAGE_KEYS } from '@/constants/storage'

const KEY = STORAGE_KEYS.positionsCushionPct

/** 3% — roughly one ordinary session on a liquid underlying. */
export const CUSHION_TIGHT_PCT_DEFAULT = 0.03

/** A warning line outside this is not a warning line; reject rather than honour it. */
export const CUSHION_PCT_MIN = 0
export const CUSHION_PCT_MAX = 0.5

export function parseCushionPct(raw: string | null): number | null {
  if (raw == null) return null
  // Number('') is 0, which is in range — an empty stored value would silently
  // become a 0% line and paint every short leg comfortable.
  const text = raw.trim()
  if (text === '') return null
  const n = Number(text)
  if (!Number.isFinite(n)) return null
  if (n < CUSHION_PCT_MIN || n > CUSHION_PCT_MAX) return null
  return n
}

function readStored(): number {
  try {
    return parseCushionPct(localStorage.getItem(KEY)) ?? CUSHION_TIGHT_PCT_DEFAULT
  } catch {
    // Private mode, blocked site data — a display threshold is not worth throwing over.
    return CUSHION_TIGHT_PCT_DEFAULT
  }
}

let current = readStored()
const listeners = new Set<() => void>()

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): number {
  return current
}

/** Test seams. Components use the hook; these exist so the store is testable. */
export const subscribeForTest = subscribe
export const readForTest = getSnapshot

export function setCushionPct(next: number): void {
  if (!Number.isFinite(next)) return
  const clamped = Math.min(CUSHION_PCT_MAX, Math.max(CUSHION_PCT_MIN, next))
  if (clamped === current) return
  current = clamped
  try {
    localStorage.setItem(KEY, String(clamped))
  } catch {
    // Kept in memory for this session; the column still colours correctly.
  }
  listeners.forEach((l) => l())
}

export function useCushionThreshold() {
  const pct = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const setPct = useCallback((next: number) => setCushionPct(next), [])
  const reset = useCallback(() => setCushionPct(CUSHION_TIGHT_PCT_DEFAULT), [])
  return { pct, setPct, reset, isDefault: pct === CUSHION_TIGHT_PCT_DEFAULT }
}
