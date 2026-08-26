import { useMemo } from 'react'
import { DEFAULT_PREFERRED_SYMBOLS } from '@/components/symbol/constants'
import { useHoldingSymbols } from '@/hooks/useHoldingSymbols'
import { useWatchlistStkSymbols } from '@/hooks/useWatchlistStkSymbols'

function uniqSorted(syms: Iterable<string>): string[] {
  return [...new Set([...syms].map((s) => s.trim().toUpperCase()).filter(Boolean))].sort()
}

export function useSymbolPickerUniverse() {
  const watchlist = useWatchlistStkSymbols()
  const holdings = useHoldingSymbols()

  const watchlistSet = useMemo(() => new Set(watchlist.symbols), [watchlist.symbols])
  const holdingsSet = useMemo(() => new Set(holdings.symbols), [holdings.symbols])

  const positionSymbols = holdings.symbols
  const watchlistOnlySymbols = useMemo(
    () => watchlist.symbols.filter((s) => !holdingsSet.has(s)),
    [watchlist.symbols, holdingsSet],
  )
  const benchmarkSymbols = useMemo(
    () =>
      DEFAULT_PREFERRED_SYMBOLS.filter((s) => !holdingsSet.has(s) && !watchlistSet.has(s)),
    [holdingsSet, watchlistSet],
  )

  const allSuggestedSymbols = useMemo(
    () =>
      uniqSorted([
        ...holdings.symbols,
        ...watchlist.symbols,
        ...DEFAULT_PREFERRED_SYMBOLS,
      ]),
    [holdings.symbols, watchlist.symbols],
  )

  return {
    watchlistSet,
    holdingsSet,
    positionSymbols,
    watchlistOnlySymbols,
    benchmarkSymbols,
    allSuggestedSymbols,
    isLoading: watchlist.isLoading || holdings.isLoading,
  }
}
