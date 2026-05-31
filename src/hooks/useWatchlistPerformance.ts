import { useQuery } from '@tanstack/react-query'
import { fetchPerformance } from '@/api/trading'
import { QUERY_KEYS } from '@/constants/queryKeys'

export function useWatchlistPerformance() {
  return useQuery({
    queryKey: QUERY_KEYS.research.performanceKelly,
    queryFn: () => fetchPerformance({ summary_only: true }),
    staleTime: 60_000,
    select: (data) => data.summary ?? null,
  })
}
