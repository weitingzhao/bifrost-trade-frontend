import { useQuery } from '@tanstack/react-query'
import { fetchPerformance } from '@/api/trading'
import { QUERY_KEYS } from '@/constants/queryKeys'

export interface PerformanceQueryParams {
  since_ts: number
  until_ts: number
  strategy_opportunity_id?: number
  strategy_instance_id?: number
}

export function usePerformanceQuery(params: PerformanceQueryParams | null) {
  return useQuery({
    queryKey: [
      ...QUERY_KEYS.trading.performance,
      params?.since_ts,
      params?.until_ts,
      params?.strategy_opportunity_id ?? null,
      params?.strategy_instance_id ?? null,
    ],
    queryFn: () =>
      fetchPerformance({
        since_ts: params!.since_ts,
        until_ts: params!.until_ts,
        granularity: 'day',
        strategy_opportunity_id: params!.strategy_opportunity_id,
        strategy_instance_id: params!.strategy_instance_id,
        source_scope: 'performance_book',
      }),
    enabled: params != null,
    staleTime: 30_000,
  })
}
