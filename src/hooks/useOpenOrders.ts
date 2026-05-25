import { useQuery } from '@tanstack/react-query'
import { fetchOpenOrders } from '@/api/market'

export function useOpenOrders() {
  return useQuery({
    queryKey: ['monitor', 'open-orders'],
    queryFn: fetchOpenOrders,
    refetchInterval: 6_000,
  })
}
