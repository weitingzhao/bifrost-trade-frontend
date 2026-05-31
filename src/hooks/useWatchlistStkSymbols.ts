import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchWatchlist } from '@/api/market'
import { QUERY_KEYS } from '@/constants/queryKeys'
import type { WatchlistItem } from '@/types/market'

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
  const { data, isLoading, isError } = useQuery({
    queryKey: QUERY_KEYS.research.watchlist,
    queryFn: async () => {
      const res = await fetchWatchlist()
      return res.items ?? []
    },
    staleTime: 60_000,
  })

  const symbols = useMemo(
    () => extractOptionableStkSymbols(data ?? []),
    [data],
  )

  return { symbols, isLoading, isError }
}
