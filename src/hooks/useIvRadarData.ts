import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchIvPercentileForSymbols, ivLookupRow } from '@/api/research/ivRadar'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { useHoldingSymbols } from '@/hooks/useHoldingSymbols'
import { useWatchlistStkSymbols } from '@/hooks/useWatchlistStkSymbols'
import type { IvLookup } from '@/api/research/ivRadar'
import type { IvRadarRow, IvRadarUniverseFilter, IvRadarUniverseItem } from '@/types/ivRadar'
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

/**
 * Join the universe onto its reads. A failed read keeps its failure
 * (`readFailed`) rather than reading as a name without an IV rank, and when
 * every read failed it throws, so the query is in error and the page says the
 * radar failed instead of listing a universe of "no data" (TD-233).
 */
export function ivRadarRows(
  universe: readonly IvRadarUniverseItem[],
  dataBySym: ReadonlyMap<string, IvLookup>,
): IvRadarRow[] {
  const rows = universe.map((item): IvRadarRow => {
    const lookup = dataBySym.get(item.symbol)
    const data = ivLookupRow(lookup)
    return {
      ...item,
      data,
      bucket: bucketByIvRank(data?.iv_rank_1y),
      readFailed: lookup?.status === 'error' ? lookup.message : null,
    }
  })
  const failed = rows.filter((r) => r.readFailed != null)
  if (rows.length > 0 && failed.length === rows.length) {
    throw new Error(`Every IV percentile read failed (${rows.length} names): ${failed[0].readFailed}`)
  }
  return rows
}

/** TanStack Query: IV percentile/rank for the assembled universe (bounded concurrency). */
export function useIvRadarData(filter: IvRadarUniverseFilter) {
  const { universe, isLoadingSources, isErrorSources, watchlistSymbols, holdingsSymbols } =
    useIvRadarUniverse(filter)

  const symbolKey = universe.map(u => u.symbol).join(',')

  const query = useQuery({
    queryKey: [...QUERY_KEYS.plugin.ivRadar, filter, symbolKey],
    queryFn: async (): Promise<IvRadarRow[]> => {
      const dataBySym = await fetchIvPercentileForSymbols(
        universe.map(u => u.symbol),
        FETCH_CONCURRENCY,
      )
      return ivRadarRows(universe, dataBySym)
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
    let failed = 0
    for (const r of rows) {
      if (r.readFailed != null) failed++
      else if (r.bucket === 'high') high++
      else if (r.bucket === 'neutral') neutral++
      else if (r.bucket === 'low') low++
      else noData++
    }
    return { high, neutral, low, noData, failed, total: rows.length }
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
