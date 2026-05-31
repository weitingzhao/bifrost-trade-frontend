import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchMarketIngestServices,
  fetchOpsHealth,
  fetchOpsCapabilities,
  controlMarketIngest,
  clearMarketIngestConflictLeases,
  type MarketIngestAction,
} from '@/api/ops'
import { QUERY_KEYS } from '@/constants/queryKeys'

export function useMarketIngestServices(token: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.ops.ingestServices, token],
    queryFn: () => fetchMarketIngestServices(token),
    refetchInterval: 15_000,
    retry: 1,
  })
}

export function useOpsHealth(token: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.ops.opsHealth, token],
    queryFn: () => fetchOpsHealth(token),
    refetchInterval: 30_000,
    retry: 1,
  })
}

export function useOpsCapabilities(token: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.ops.capabilities, token],
    queryFn: () => fetchOpsCapabilities(token),
    staleTime: 30_000,
    retry: 1,
  })
}

export function useControlMarketIngest(token: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ serviceId, action }: { serviceId: string; action: MarketIngestAction }) =>
      controlMarketIngest(serviceId, action, token),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.ops.ingestServices })
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.monitor.status })
    },
  })
}

export function useClearConflictLeases(token: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => clearMarketIngestConflictLeases(token),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.ops.ingestServices })
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.monitor.status })
    },
  })
}
