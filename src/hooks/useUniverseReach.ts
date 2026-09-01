import { useQuery } from '@tanstack/react-query'
import { fetchUniverseReach, type UniverseReach } from '@/api/research/universeReach'
import { QUERY_KEYS } from '@/constants/queryKeys'

/**
 * Symbol counts at each layer between the warehouse and the Loop.
 *
 * The backend caches for 15 minutes and the numbers move once a day at most, so
 * this stays fresh far longer than a normal query.
 */
export function useUniverseReach() {
  return useQuery<UniverseReach>({
    queryKey: QUERY_KEYS.research.universeReach,
    queryFn: fetchUniverseReach,
    staleTime: 15 * 60_000,
    refetchOnWindowFocus: false,
  })
}
