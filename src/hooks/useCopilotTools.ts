import { useQuery } from '@tanstack/react-query'
import { fetchCopilotTools } from '@/api/research/copilotTools'

/** The registry changes with a release, not with a click. */
export function useCopilotTools() {
  return useQuery({
    queryKey: ['research', 'copilot', 'tools'],
    queryFn: fetchCopilotTools,
    staleTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  })
}
