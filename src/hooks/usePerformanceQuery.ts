import { useQuery } from '@tanstack/react-query'
import { fetchPerformance } from '@/api/trading'
import { QUERY_KEYS } from '@/constants/queryKeys'

export interface PerformanceQueryParams {
  since_ts: number
  until_ts: number
  strategy_opportunity_id?: number
  trade_id?: number
}

export function usePerformanceQuery(params: PerformanceQueryParams | null) {
  return useQuery({
    queryKey: [
      ...QUERY_KEYS.trading.performance,
      params?.since_ts,
      params?.until_ts,
      params?.strategy_opportunity_id ?? null,
      params?.trade_id ?? null,
    ],
    queryFn: () =>
      fetchPerformance({
        from_ts: params!.since_ts,
        to_ts: params!.until_ts,
        granularity: 'day',
        strategy_opportunity_id: params!.strategy_opportunity_id,
        trade_id: params!.trade_id,
        source_scope: 'performance_book',
      }),
    enabled: params != null,
    staleTime: 30_000,
  })
}
