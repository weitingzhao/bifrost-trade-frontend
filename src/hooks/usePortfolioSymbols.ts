import { useCallback, useMemo } from 'react'
import { useHoldingSymbols } from '@/hooks/useHoldingSymbols'
import { useWatchlistStkSymbols } from '@/hooks/useWatchlistStkSymbols'

/** Portfolio-aware universe chip values (Analyze Wave K). */
export type PortfolioUniverse = 'all' | 'holdings' | 'watchlist' | 'both'

export const PORTFOLIO_UNIVERSE_OPTIONS: ReadonlyArray<{
  value: PortfolioUniverse
  label: string
}> = [
  { value: 'all', label: 'All' },
  { value: 'holdings', label: 'Holdings' },
  { value: 'watchlist', label: 'Watchlist' },
  { value: 'both', label: 'Both' },
]

/**
 * Holdings + optionable watchlist symbols with membership helpers.
 * Caches via underlying TanStack Query hooks — no separate staleTime.
 */
export function usePortfolioSymbols() {
  const holdings = useHoldingSymbols()
  const watchlist = useWatchlistStkSymbols()

  const holdingsSymbols = holdings.symbols
  const watchlistSymbols = watchlist.symbols

  const holdingsSet = useMemo(
    () => new Set(holdingsSymbols.map((s) => s.trim().toUpperCase()).filter(Boolean)),
    [holdingsSymbols],
  )
  const watchlistSet = useMemo(
    () => new Set(watchlistSymbols.map((s) => s.trim().toUpperCase()).filter(Boolean)),
    [watchlistSymbols],
  )

  const isHolding = useCallback(
    (sym: string) => holdingsSet.has((sym || '').trim().toUpperCase()),
    [holdingsSet],
  )
  const isWatchlist = useCallback(
    (sym: string) => watchlistSet.has((sym || '').trim().toUpperCase()),
    [watchlistSet],
  )
  const isBoth = useCallback(
    (sym: string) => {
      const u = (sym || '').trim().toUpperCase()
      return holdingsSet.has(u) && watchlistSet.has(u)
    },
    [holdingsSet, watchlistSet],
  )

  /** Filter a symbol list by portfolio universe. `both` = holdings ∪ watchlist. */
  const filterSymbols = useCallback(
    (universe: PortfolioUniverse, symbols: string[]): string[] => {
      if (universe === 'all') return symbols
      return symbols.filter((s) => {
        const u = (s || '').trim().toUpperCase()
        if (!u) return false
        const h = holdingsSet.has(u)
        const w = watchlistSet.has(u)
        if (universe === 'holdings') return h
        if (universe === 'watchlist') return w
        return h || w
      })
    },
    [holdingsSet, watchlistSet],
  )

  return {
    holdingsSymbols,
    watchlistSymbols,
    holdingsSet,
    watchlistSet,
    isLoading: holdings.isLoading || watchlist.isLoading,
    isError: holdings.isError || watchlist.isError,
    isHolding,
    isWatchlist,
    isBoth,
    filterSymbols,
  }
}
