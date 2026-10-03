import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchOpportunities, fetchStructures, fetchStrategyInstances, fetchStrategyInstance, fetchGateSafety, fetchAllocations, fetchWinRate } from '@/api/strategy'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { serverStatesOf, type ServerInstanceState } from '@/utils/reviewInstances'

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

export function useStrategyInstances(
  params?: {
    opportunityId?: number
    accountId?: string
    openedAtFrom?: number
  },
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [
      ...QUERY_KEYS.strategy.instances,
      params?.opportunityId ?? null,
      params?.accountId ?? null,
      params?.openedAtFrom ?? null,
    ],
    queryFn: () => fetchStrategyInstances(params),
    refetchInterval: 30_000,
    enabled: options?.enabled ?? true,
  })
}

/**
 * Each instance's `state` / `closed_on` from the instance list (core 0.41.0,
 * TD-43) — the open / closed answer Review reads. `cachedOnly` reads whatever
 * the list query already holds without fetching it (the Review menu badge).
 */
export function useInstanceStates(cachedOnly = false): ReadonlyMap<number, ServerInstanceState> {
  const q = useStrategyInstances(undefined, { enabled: !cachedOnly })
  return useMemo(() => serverStatesOf(q.data?.items), [q.data?.items])
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

export function useWinRate(
  params?: { sinceTs?: number; untilTs?: number },
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...QUERY_KEYS.strategy.winRate, params?.sinceTs ?? null, params?.untilTs ?? null],
    queryFn: () => fetchWinRate(params),
    staleTime: 60_000,
    enabled: options?.enabled ?? true,
  })
}
