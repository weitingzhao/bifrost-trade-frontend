/**
 * Account cash transactions in a time range (`GET /api/account/transactions`).
 * Under the shared `QUERY_KEYS.trading.transactions` prefix, so a Flex ingest
 * that invalidates the prefix refreshes this read too.
 */
import { useQuery } from '@tanstack/react-query'
import { getTransactions } from '@/api/trading'
import { QUERY_KEYS } from '@/constants/queryKeys'

export function useAccountTransactions(
  r: { fromTs?: number | null; toTs?: number | null; limit?: number },
  opts: { enabled?: boolean } = {},
) {
  const limit = r.limit ?? 500
  return useQuery({
    queryKey: [...QUERY_KEYS.trading.transactions, 'range', r.fromTs ?? null, r.toTs ?? null, limit],
    queryFn: () =>
      getTransactions({ from_ts: r.fromTs ?? undefined, to_ts: r.toTs ?? undefined, limit }),
    enabled: opts.enabled ?? true,
    staleTime: 60_000,
  })
}
