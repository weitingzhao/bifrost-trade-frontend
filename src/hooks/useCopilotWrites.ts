import { useQuery } from '@tanstack/react-query'
import { fetchCopilotWrites } from '@/api/research/copilotWrites'

/** The Desk's Writes table: the last seven UTC days, the standing's cadence. */
export function useCopilotWrites(days = 7) {
  return useQuery({
    queryKey: ['research', 'copilot', 'writes', days],
    queryFn: () => fetchCopilotWrites(days),
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}
