/**
 * The daily book snapshots: closing NAV per account and the session-over-session
 * attribution (api 0.12.0, TD-138). The nightly job writes once a day after the
 * close, so the reads are cached for five minutes.
 */
import { useQuery } from '@tanstack/react-query'
import { fetchNavHistory, fetchPnlAttribution, type SnapshotRange } from '@/api/snapshots'
import { QUERY_KEYS } from '@/constants/queryKeys'

const STALE_MS = 5 * 60_000

export function useNavHistory(r: Pick<SnapshotRange, 'from' | 'to' | 'accountId'> = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.portfolio.navHistory(r),
    queryFn: ({ signal }) => fetchNavHistory(r, signal),
    staleTime: STALE_MS,
  })
}

export function usePnlAttribution(
  r: Pick<SnapshotRange, 'from' | 'to' | 'tradeId'> = {},
  opts: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: QUERY_KEYS.portfolio.pnlAttribution(r),
    queryFn: ({ signal }) => fetchPnlAttribution(r, signal),
    staleTime: STALE_MS,
    enabled: opts.enabled ?? true,
  })
}
