import { useQuery } from '@tanstack/react-query'
import { fetchWatchlist } from '@/api/market'

export function useWatchlist() {
  return useQuery({
    queryKey: ['market', 'watchlist'],
    queryFn: fetchWatchlist,
    staleTime: 30_000,
  })
}
