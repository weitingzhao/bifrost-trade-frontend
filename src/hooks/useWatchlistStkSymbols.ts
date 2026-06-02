import { useMemo } from 'react'
import type { WatchlistItem } from '@/types/market'
import { useWatchlist } from '@/hooks/useWatchlist'

function extractOptionableStkSymbols(items: WatchlistItem[]): string[] {
  const syms = items
    .filter(i => (i.sec_type || '').trim().toUpperCase() !== 'OPT')
    .filter(i => i.optionable === true)
    .map(i => (i.symbol || '').trim())
    .filter(Boolean)
  return [...new Set(syms)].sort()
}

/** STK symbols from watchlist that are optionable. */
export function useWatchlistStkSymbols() {
  const { data, isLoading, isError } = useWatchlist()

  const symbols = useMemo(
    () => extractOptionableStkSymbols(Array.isArray(data?.items) ? data.items : []),
    [data],
  )

  return { symbols, isLoading, isError }
}
