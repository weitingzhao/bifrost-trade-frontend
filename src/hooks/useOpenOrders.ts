import { useQuery } from '@tanstack/react-query'
import { fetchOpenOrders } from '@/api/market'
import { QUERY_KEYS } from '@/constants/queryKeys'

export function useOpenOrders() {
  return useQuery({
    queryKey: QUERY_KEYS.monitor.openOrders,
    queryFn: fetchOpenOrders,
    // 15s — order submissions should call queryClient.invalidate directly
    // for instant feedback; short polls only add load without helping UX.
    refetchInterval: 15_000,
  })
}
