import { useQuery } from '@tanstack/react-query'
import { fetchCopilotStanding } from '@/api/research/copilotStanding'
import { fetchSignalHealth } from '@/api/research/similarRegime'

export function useCopilotStanding() {
  return useQuery({
    queryKey: ['research-engine', 'copilot', 'standing'],
    queryFn: fetchCopilotStanding,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}

/** Same key the Signal Health page uses, so the two never disagree. */
export function useSignalHealthSummary() {
  return useQuery({
    queryKey: ['research-engine', 'signal-health'],
    queryFn: fetchSignalHealth,
    staleTime: 60_000,
  })
}
