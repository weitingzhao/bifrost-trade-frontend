import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchOpportunities, fetchStructures, fetchTrades, fetchTrade, fetchGateSets, fetchAllocations, fetchWinRate } from '@/api/strategy'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { serverStatesOf, type ServerTradeState } from '@/utils/reviewedTrades'

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

export function useGateSets() {
  return useQuery({
    queryKey: QUERY_KEYS.strategy.gateSets,
    queryFn: fetchGateSets,
    staleTime: 60_000,
  })
}

export function useTrades(
  params?: {
    opportunityId?: number
    accountId?: string
    openedAtFrom?: number
  },
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [
      ...QUERY_KEYS.trades.list,
      params?.opportunityId ?? null,
      params?.accountId ?? null,
      params?.openedAtFrom ?? null,
    ],
    queryFn: () => fetchTrades(params),
    refetchInterval: 30_000,
    enabled: options?.enabled ?? true,
  })
}

/**
 * Each instance's `state` / `closed_on` from the instance list (core 0.41.0,
 * TD-43) — the open / closed answer Review reads. `cachedOnly` reads whatever
 * the list query already holds without fetching it (the Review menu badge).
 */
export function useTradeStates(cachedOnly = false): ReadonlyMap<number, ServerTradeState> {
  const q = useTrades(undefined, { enabled: !cachedOnly })
  return useMemo(() => serverStatesOf(q.data?.items), [q.data?.items])
}

export function useTrade(tradeId: number | null | undefined, enabled = true) {
  return useQuery({
    queryKey: [...QUERY_KEYS.trades.detail, tradeId],
    queryFn: () => fetchTrade(tradeId!),
    enabled: enabled && tradeId != null && tradeId > 0,
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
    queryKey: [...QUERY_KEYS.trades.winRate, params?.sinceTs ?? null, params?.untilTs ?? null],
    queryFn: () => fetchWinRate(params),
    staleTime: 60_000,
    enabled: options?.enabled ?? true,
  })
}
