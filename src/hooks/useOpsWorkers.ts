import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchOpsWorkers,
  fetchOpsQueuesSummary,
  fetchWorkerProfiles,
  fetchWorkerInstances,
  fetchCeleryCapabilities,
  fetchBrokerStatusExtended,
  controlBroker,
  scaleWorker,
} from '@/api/ops'
import { QUERY_KEYS } from '@/constants/queryKeys'
import type { BrokerAction, ScaleAction } from '@/types/ops'

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

export function useControlBroker() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (action: BrokerAction) => controlBroker(action),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.ops.brokerStatus })
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.ops.workers })
    },
  })
}

export function useScaleWorker() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { action: ScaleAction; instance_id?: string; worker_type?: string; force?: boolean }) =>
      scaleWorker(params),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.ops.workers })
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.ops.workerInstances })
    },
  })
}
