import { useQuery } from '@tanstack/react-query'
import { fetchExecutionsFreshness } from '@/api/trading'

export function useExecutionsFreshness() {
  return useQuery({
    queryKey: ['trading', 'executions-freshness'],
    queryFn: fetchExecutionsFreshness,
    refetchInterval: 60_000,
  })
}
