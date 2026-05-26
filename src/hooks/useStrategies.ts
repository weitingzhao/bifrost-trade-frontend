import { useQuery } from '@tanstack/react-query'
import { fetchOpportunities, fetchStructures, fetchStrategyInstances, fetchGateSafety, fetchAllocations } from '@/api/strategy'
import { QUERY_KEYS } from '@/constants/queryKeys'

export function useOpportunities() {
  return useQuery({
    queryKey: QUERY_KEYS.strategy.opportunities,
    queryFn: fetchOpportunities,
    staleTime: 60_000,
  })
}

export function useStructures() {
  return useQuery({
    queryKey: QUERY_KEYS.strategy.structures,
    queryFn: fetchStructures,
    staleTime: 60_000,
  })
}

export function useGateSafety() {
  return useQuery({
    queryKey: QUERY_KEYS.strategy.gateSafety,
    queryFn: fetchGateSafety,
    staleTime: 60_000,
  })
}

export function useStrategyInstances(params?: { opportunityId?: number; accountId?: string }) {
  return useQuery({
    queryKey: [...QUERY_KEYS.strategy.instances, params?.opportunityId ?? null, params?.accountId ?? null],
    queryFn: () => fetchStrategyInstances(params),
    refetchInterval: 30_000,
  })
}

export function useAllocations() {
  return useQuery({
    queryKey: QUERY_KEYS.strategy.allocations,
    queryFn: () => fetchAllocations(),
    staleTime: 30_000,
  })
}
