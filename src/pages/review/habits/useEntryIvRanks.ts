/**
 * The trailing year of IV rank for every name the closed book traded — one
 * read per underlying, so `entryIvRank.ts` can look up each trade's entry
 * session. Sixteen names on DEV (2026-09-26), about 60 ms each.
 *
 * A name that fails reads as absent, not as a rank of zero: its trades drop
 * out of the sample and the reading's n says how many are left.
 */
import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { fetchIvRankHistory } from '@/api/research/ivRadar'
import type { IvPercentileRow } from '@/types/ivRadar'
import type { ReviewTrade } from '@/utils/reviewTrades'

/** The store's own cap: `lookback_days` answers at most a year. */
const LOOKBACK_DAYS = 365

export function useEntryIvRanks(trades: readonly ReviewTrade[]) {
  const names = useMemo(
    () => [...new Set(trades.map((t) => t.underlying).filter(Boolean))].sort(),
    [trades],
  )
  const queries = useQueries({
    queries: names.map((name) => ({
      queryKey: ['iv-rank-history', name, LOOKBACK_DAYS],
      queryFn: () => fetchIvRankHistory(name, LOOKBACK_DAYS),
      staleTime: 60 * 60_000,
    })),
  })
  const stamp = queries.map((q) => `${q.dataUpdatedAt}:${q.isError ? 1 : 0}`).join(',')
  const rowsByName = useMemo(() => {
    const by = new Map<string, readonly IvPercentileRow[] | null | undefined>()
    names.forEach((name, i) => {
      const q = queries[i]
      by.set(name, q?.isError ? null : q?.data)
    })
    return by
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stamp, names])
  return {
    rowsByName,
    loading: queries.some((q) => q.isPending),
    failed: queries.filter((q) => q.isError).length,
    names: names.length,
  }
}
