import { useQuery } from '@tanstack/react-query'
import { fetchWatchlist } from '@/api/market'
import { QUERY_KEYS } from '@/constants/queryKeys'

export function useWatchlist() {
  return useQuery({
    queryKey: QUERY_KEYS.research.watchlist,
    queryFn: fetchWatchlist,
    staleTime: 30_000,
  })
}
