import { useQuery } from '@tanstack/react-query'
import { fetchOpenOrders } from '@/api/market'
import { QUERY_KEYS } from '@/constants/queryKeys'

export function useOpenOrders() {
  return useQuery({
    queryKey: QUERY_KEYS.monitor.openOrders,
    queryFn: fetchOpenOrders,
    refetchInterval: 6_000,
  })
}
