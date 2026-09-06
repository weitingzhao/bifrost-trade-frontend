/**
 * A small enumerated choice that survives a reload — which grid view is open,
 * how rows expand. Display preferences, not positions or rules, so they live in
 * the browser like the cushion threshold does. A stored value outside the
 * allowed set is ignored rather than honoured: a stale key must not pick a
 * view that no longer exists.
 */
import { useCallback, useState } from 'react'

export function usePersistedChoice<T extends string>(
  key: string,
  fallback: T,
  allowed: readonly T[],
): [T, (next: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw != null && (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback
    } catch {
      return fallback
    }
  })
  const set = useCallback(
    (next: T) => {
      setValue(next)
      try {
        localStorage.setItem(key, next)
      } catch {
        // Private mode or blocked storage: the choice still applies for this visit.
      }
    },
    [key],
  )
  return [value, set]
}
