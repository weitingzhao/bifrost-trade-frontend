/**
 * A page's own view — filters, sort, the selected row, the open face or
 * section — kept per route for this tab's session (design Rev .75 §4, Rev
 * .79 §2), beside the scroll the lane already keeps (Rev .71, usePageLane).
 * Leave a page and come back, and it is as you left it.
 *
 * The key is the route: path plus hash, as the design's `pageView` keys it.
 * The query is not part of the key because on most pages the query *is* the
 * view. Each page lists the keys it keeps; data, drafts, toasts and records
 * of what was done never go here.
 *
 * Two ways in, for the two places a page keeps its view:
 * - `usePageViewState(name, initial)` — a useState that remembers.
 * - `usePageViewParams(keys)` — for a view that lives in the URL: arriving
 *   with none of those params restores the last ones; every change is kept.
 *   A link that carries its own params wins, as a link should.
 */
import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'

const PARAMS = '__params'

export function pageViewKey(loc: { pathname: string; hash: string }): string {
  return `bifrost.view:${loc.pathname}${loc.hash.split('?')[0]}`
}

export function readPageView(key: string): Record<string, unknown> {
  try {
    const o = JSON.parse(sessionStorage.getItem(key) ?? '{}') as unknown
    return o && typeof o === 'object' && !Array.isArray(o) ? (o as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

export function writePageView(key: string, name: string, value: unknown): void {
  try {
    const o = readPageView(key)
    if (value === undefined) delete o[name]
    else o[name] = value
    sessionStorage.setItem(key, JSON.stringify(o))
  } catch {
    // Storage refused: the page opens as new, which is what it did before.
  }
}

/**
 * The route this component was mounted on — a page lives on one route. For a
 * hook that keeps several pieces of view together and reads and writes them
 * itself (`readPageView` / `writePageView`).
 */
export function usePageViewKey(): string {
  const loc = useLocation()
  const [key] = useState(() => pageViewKey(loc))
  return key
}

export function usePageViewState<T>(name: string, initial: T | (() => T)): [T, Dispatch<SetStateAction<T>>] {
  const key = usePageViewKey()
  const [value, setValue] = useState<T>(() => {
    const saved = readPageView(key)
    if (name in saved) return saved[name] as T
    return typeof initial === 'function' ? (initial as () => T)() : initial
  })
  useEffect(() => {
    writePageView(key, name, value)
  }, [key, name, value])
  return [value, setValue]
}

/** The same for a Set, kept as an array (JSON has no sets). */
export function usePageViewSet<T extends string | number>(
  name: string,
  initial: readonly T[] = [],
): [Set<T>, Dispatch<SetStateAction<Set<T>>>] {
  const key = usePageViewKey()
  const [value, setValue] = useState<Set<T>>(() => {
    const saved = readPageView(key)[name]
    return new Set(Array.isArray(saved) ? (saved as T[]) : initial)
  })
  useEffect(() => {
    writePageView(key, name, [...value])
  }, [key, name, value])
  return [value, setValue]
}

/** The saved values of `keys` — only the ones that were set. */
export function pickParams(params: URLSearchParams, keys: readonly string[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const k of keys) {
    const v = params.get(k)
    if (v != null) out[k] = v
  }
  return out
}

export function usePageViewParams(keys: readonly string[]): void {
  const key = usePageViewKey()
  const [params, setParams] = useSearchParams()
  const arrived = useRef(false)
  const keysSig = keys.join('|')

  const restore = useCallback(
    (saved: Record<string, string>) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [k, v] of Object.entries(saved)) if (!next.has(k)) next.set(k, v)
          return next
        },
        { replace: true },
      ),
    [setParams],
  )

  useEffect(() => {
    const ks = keysSig.split('|')
    const now = pickParams(params, ks)
    if (!arrived.current) {
      arrived.current = true
      const saved = (readPageView(key)[PARAMS] ?? {}) as Record<string, string>
      if (Object.keys(now).length === 0 && Object.keys(saved).length > 0) {
        restore(saved)
        return
      }
    }
    writePageView(key, PARAMS, now)
  }, [key, keysSig, params, restore])
}
