/**
 * The one symbol the shell is on.
 *
 * Every page that is about a ticker reads it from `?symbol=`, so the URL is the
 * value — not a store the URL is synced against. What the URL cannot hold is
 * the symbol you were last looking at while standing on a page that does not
 * take one; that is the *held* symbol, and it lives in sessionStorage so a
 * reload inside one sitting keeps your place and a new tab starts clean.
 *
 * Two states, and the top-bar chip shows which:
 *   scope — the current route reads it, so it is narrowing what you see
 *   held  — the current route ignores it, and it is waiting for the next page
 *
 * `useResearchContext` and `usePositionsScope` both read the same query
 * parameter and keep working unchanged; this module owns the held half, which
 * used to be private to Research.
 */
import { useCallback, useEffect, useRef } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { routeFor } from '@/layout/routeRegistry'

/** Historical name — the record predates the symbol being a shell-wide idea. */
const STORAGE_KEY = 'bifrost-research-context'

export interface StoredContext {
  symbol?: string
  date?: string
}

export function readStoredContext(): StoredContext {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return (JSON.parse(raw) as StoredContext) ?? {}
  } catch {
    return {}
  }
}

export function writeStoredContext(symbol: string, date: string) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ symbol, date }))
  } catch {
    // ignore quota / private mode
  }
}

export function normalizeSymbol(value: string | null | undefined): string {
  return (value ?? '').trim().toUpperCase()
}

export interface SymbolContext {
  /** The symbol in play: the URL's if it has one, otherwise the held one. */
  symbol: string
  /** The symbol is narrowing this page right now. */
  isScoped: boolean
  /** There is a symbol, but it is not being applied here. */
  isHeld: boolean
  setSymbol: (value: string) => void
  clearSymbol: () => void
}

export function useSymbolContext(): SymbolContext {
  const [searchParams, setSearchParams] = useSearchParams()
  const { pathname } = useLocation()
  const urlSymbol = normalizeSymbol(searchParams.get('symbol'))
  const symbol = urlSymbol || normalizeSymbol(readStoredContext().symbol)
  // Scoped means the page is actually filtered by it, which takes both a route
  // that reads the parameter and a parameter to read. Clear the filter on
  // Positions and the symbol is still held -- but nothing on screen is narrowed
  // by it, so the chip must not claim otherwise.
  const isScoped = Boolean(routeFor(pathname).symbolScope) && Boolean(urlSymbol)

  const write = useCallback(
    (value: string) => {
      const sym = normalizeSymbol(value)
      writeStoredContext(sym, readStoredContext().date ?? '')
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (sym) next.set('symbol', sym)
          else next.delete('symbol')
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  return {
    symbol,
    isScoped,
    isHeld: Boolean(symbol) && !isScoped,
    setSymbol: write,
    // Clearing has to drop the held value too, or the next scoped page would
    // hand the symbol straight back and the chip would look unclearable.
    clearSymbol: useCallback(() => write(''), [write]),
  }
}

/**
 * Carries the held symbol onto a scoped route, and remembers one that arrives
 * by link. Mount once, in the shell.
 *
 * It fires on a change of pathname and nothing else. Reacting to the query
 * string instead would make it fight the pages: clear the symbol filter on
 * Positions and this would put it straight back from the held value.
 */
export function useHeldSymbolSync() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { pathname } = useLocation()
  const lastPath = useRef<string | null>(null)

  useEffect(() => {
    const arrived = lastPath.current !== pathname
    lastPath.current = pathname
    const urlSymbol = normalizeSymbol(searchParams.get('symbol'))

    if (urlSymbol) {
      // Arrived carrying one — that is now the symbol you are on.
      const stored = readStoredContext()
      if (normalizeSymbol(stored.symbol) !== urlSymbol) {
        writeStoredContext(urlSymbol, stored.date ?? '')
      }
      return
    }
    if (!arrived || !routeFor(pathname).symbolScope) return

    const held = normalizeSymbol(readStoredContext().symbol)
    if (!held) return
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('symbol', held)
        return next
      },
      { replace: true },
    )
  }, [pathname, searchParams, setSearchParams])
}
