import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchIvPercentileForSymbols } from '@/api/research/ivRadar'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { useHoldingSymbols } from '@/hooks/useHoldingSymbols'
import { useWatchlistStkSymbols } from '@/hooks/useWatchlistStkSymbols'
import type { IvRadarRow, IvRadarUniverseFilter } from '@/types/ivRadar'
import {
  assembleUniverse,
  bucketByIvRank,
} from '@/utils/ivRadar/universe'

const FETCH_CONCURRENCY = 4

export function useIvRadarUniverse(filter: IvRadarUniverseFilter) {
  const watchlist = useWatchlistStkSymbols()
  const holdings = useHoldingSymbols()

  const universe = useMemo(
    () =>
      assembleUniverse({
        filter,
        watchlist: watchlist.symbols,
        holdings: holdings.symbols,
      }),
    [filter, watchlist.symbols, holdings.symbols],
  )

  return {
    universe,
    watchlistSymbols: watchlist.symbols,
    holdingsSymbols: holdings.symbols,
    isLoadingSources: watchlist.isLoading || holdings.isLoading,
    isErrorSources: watchlist.isError || holdings.isError,
  }
}

/** TanStack Query: IV percentile/rank for the assembled universe (bounded concurrency). */
export function useIvRadarData(filter: IvRadarUniverseFilter) {
  const { universe, isLoadingSources, isErrorSources, watchlistSymbols, holdingsSymbols } =
    useIvRadarUniverse(filter)

  const symbolKey = universe.map(u => u.symbol).join(',')

  const query = useQuery({
    queryKey: [...QUERY_KEYS.research.ivRadar, filter, symbolKey],
    queryFn: async (): Promise<IvRadarRow[]> => {
      const dataBySym = await fetchIvPercentileForSymbols(
        universe.map(u => u.symbol),
        FETCH_CONCURRENCY,
      )
      return universe.map(item => {
        const data = dataBySym.get(item.symbol) ?? null
        return {
          ...item,
          data,
          bucket: bucketByIvRank(data?.iv_rank_1y),
        }
      })
    },
    enabled: !isLoadingSources,
    staleTime: 60_000,
    refetchInterval: 120_000,
  })

  const rows = useMemo(() => query.data ?? [], [query.data])
  const counts = useMemo(() => {
    let high = 0
    let neutral = 0
    let low = 0
    let noData = 0
    for (const r of rows) {
      if (r.bucket === 'high') high++
      else if (r.bucket === 'neutral') neutral++
      else if (r.bucket === 'low') low++
      else noData++
    }
    return { high, neutral, low, noData, total: rows.length }
  }, [rows])

  return {
    ...query,
    rows,
    counts,
    universe,
    watchlistSymbols,
    holdingsSymbols,
    isLoadingSources,
    isErrorSources,
    isLoading: isLoadingSources || query.isLoading,
  }
}
