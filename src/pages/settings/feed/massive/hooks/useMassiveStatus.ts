import { useQuery } from '@tanstack/react-query'
import { fetchMassiveStatus } from '@/api/massive'
import { QUERY_KEYS } from '@/constants/queryKeys'

/** Shared with Research → Option Discovery (same query cache). */
export function useMassiveStatus() {
  return useQuery({
    queryKey: QUERY_KEYS.research.discovery.massiveStatus,
    queryFn: fetchMassiveStatus,
    staleTime: 120_000,
  })
}
