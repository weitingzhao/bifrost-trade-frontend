import { useQuery } from '@tanstack/react-query'
import {
  fetchOpsWorkers,
  fetchOpsQueuesSummary,
  fetchWorkerProfiles,
  fetchWorkerInstances,
  fetchCeleryCapabilities,
  fetchBrokerStatusExtended,
} from '@/api/ops'
import { QUERY_KEYS } from '@/constants/queryKeys'

export function useOpsWorkers() {
  return useQuery({
    queryKey: QUERY_KEYS.ops.workers,
    queryFn: fetchOpsWorkers,
    refetchInterval: 10_000,
  })
}

export function useOpsQueuesSummary() {
  return useQuery({
    queryKey: QUERY_KEYS.ops.queuesSummary,
    queryFn: fetchOpsQueuesSummary,
    refetchInterval: 10_000,
  })
}

export function useWorkerProfiles() {
  return useQuery({
    queryKey: QUERY_KEYS.ops.workerProfiles,
    queryFn: fetchWorkerProfiles,
    staleTime: 60_000,
  })
}

export function useWorkerInstances() {
  return useQuery({
    queryKey: QUERY_KEYS.ops.workerInstances,
    queryFn: fetchWorkerInstances,
    refetchInterval: 15_000,
  })
}

export function useCeleryCapabilities() {
  return useQuery({
    queryKey: QUERY_KEYS.ops.celeryCapabilities,
    queryFn: fetchCeleryCapabilities,
    staleTime: 120_000,
  })
}

export function useBrokerStatusExtended() {
  return useQuery({
    queryKey: QUERY_KEYS.ops.brokerStatus,
    queryFn: fetchBrokerStatusExtended,
    refetchInterval: 15_000,
  })
}
