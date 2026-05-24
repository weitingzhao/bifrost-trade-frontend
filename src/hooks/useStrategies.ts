import { useQuery } from '@tanstack/react-query'
import { fetchOpportunities, fetchStructures, fetchStrategyInstances } from '@/api/strategy'

export function useOpportunities() {
  return useQuery({
    queryKey: ['strategy', 'opportunities'],
    queryFn: fetchOpportunities,
    staleTime: 60_000,
  })
}

export function useStructures() {
  return useQuery({
    queryKey: ['strategy', 'structures'],
    queryFn: fetchStructures,
    staleTime: 60_000,
  })
}

export function useStrategyInstances(opportunityId?: number) {
  return useQuery({
    queryKey: ['strategy', 'instances', opportunityId ?? null],
    queryFn: () => fetchStrategyInstances({ opportunityId }),
    refetchInterval: 30_000,
  })
}
