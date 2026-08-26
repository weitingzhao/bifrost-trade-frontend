import { useQuery } from '@tanstack/react-query'
import { fetchCopilotSessions } from '@/api/researchCopilotSessions'

export function useCopilotSessions(limit = 10) {
  return useQuery({
    queryKey: ['research', 'copilot', 'sessions', limit],
    queryFn: () => fetchCopilotSessions(limit),
    staleTime: 15_000,
  })
}
