import { useQuery } from '@tanstack/react-query'
import { fetchOpportunities, fetchStructures, fetchStrategyInstances, fetchStrategyInstance, fetchGateSafety, fetchAllocations, fetchWinRate } from '@/api/strategy'
import { QUERY_KEYS } from '@/constants/queryKeys'

export function useOpportunities(activeOnly = false) {
  return useQuery({
    queryKey: [...QUERY_KEYS.strategy.opportunities, activeOnly] as const,
    queryFn: () => fetchOpportunities(activeOnly),
    staleTime: 60_000,
  })
}

export function useStructures() {
  return useQuery({
    queryKey: [...QUERY_KEYS.strategy.structures, 'active'],
    queryFn: () => fetchStructures(true),
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

export function useStrategyInstance(instanceId: number | null | undefined, enabled = true) {
  return useQuery({
    queryKey: [...QUERY_KEYS.strategy.instanceDetail, instanceId],
    queryFn: () => fetchStrategyInstance(instanceId!),
    enabled: enabled && instanceId != null && instanceId > 0,
    staleTime: 60_000,
  })
}

export function useAllocations() {
  return useQuery({
    queryKey: QUERY_KEYS.strategy.allocations,
    queryFn: () => fetchAllocations(),
    staleTime: 30_000,
  })
}

export function useWinRate(params?: { sinceTs?: number; untilTs?: number }) {
  return useQuery({
    queryKey: [...QUERY_KEYS.strategy.winRate, params?.sinceTs ?? null, params?.untilTs ?? null],
    queryFn: () => fetchWinRate(params),
    staleTime: 60_000,
  })
}
