import { useQuery } from '@tanstack/react-query'
import { fetchTrades } from '@/api/strategy'
import { QUERY_KEYS } from '@/constants/queryKeys'
import type { TradesResponse } from '@/types/strategy'

// Module-level so every token on a page shares one Set per response, not one per render.
const toIds = (r: TradesResponse) => new Set(r.items.map((i) => i.trade_id))

/** The ids the book holds — the same read as the unfiltered instance list, without its polling. */
export function useTradeIndex(): ReadonlySet<number> | null {
  const q = useQuery({
    queryKey: [...QUERY_KEYS.trades.list, null, null, null],
    queryFn: () => fetchTrades(),
    staleTime: 60_000,
    select: toIds,
  })
  return q.data ?? null
}
