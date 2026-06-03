import { useQuery } from '@tanstack/react-query'
import { fetchExecutionsRange } from '@/api/trading'
import { QUERY_KEYS } from '@/constants/queryKeys'

/** Recent executions for Subscribe snapshot; refetches when status poll updates. */
export function useSubscribeExecutions(statusDataUpdatedAt: number | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.monitor.subscribeExecutions(statusDataUpdatedAt),
    queryFn: () => fetchExecutionsRange({ limit: 20 }),
    staleTime: 0,
  })
}
