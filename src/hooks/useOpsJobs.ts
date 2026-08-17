import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchAggregatedJobQueuesSummary,
  fetchOpsAudit,
  fetchBarsJobs,
  deleteAllBarsJobs,
  postRetryBarsJob,
  postRetryFailedBarsJobs,
  trimBarsJobs,
} from '@/api/ops'
import { fetchMarketDataPluginCeleryBeatSchedule } from '@/api/research'
import { QUERY_KEYS } from '@/constants/queryKeys'

export interface BarsJobsFilter {
  limit: number
  offset: number
  status?: string | null
}

export function useAggregatedJobQueuesSummary() {
  return useQuery({
    queryKey: QUERY_KEYS.ops.aggregatedJobs,
    queryFn: fetchAggregatedJobQueuesSummary,
    refetchInterval: 10_000,
  })
}

export function useOpsAudit(limit = 100) {
  return useQuery({
    queryKey: [...QUERY_KEYS.ops.audit, limit],
    queryFn: () => fetchOpsAudit(limit),
    refetchInterval: 30_000,
  })
}

export function useMarketDataPluginCeleryBeat() {
  return useQuery({
    queryKey: QUERY_KEYS.research.celeryBeat,
    queryFn: fetchMarketDataPluginCeleryBeatSchedule,
    staleTime: 120_000,
  })
}

export function useBarsJobs(filter: BarsJobsFilter) {
  return useQuery({
    queryKey: [...QUERY_KEYS.ops.barsJobs, filter],
    queryFn: () => fetchBarsJobs(filter.limit, filter.offset, filter.status),
    refetchInterval: 10_000,
  })
}

// ── Mutations ─────────────────────────────────────────────────────────────────

function useInvalidateJobQueries() {
  const qc = useQueryClient()
  return () => {
    void qc.invalidateQueries({ queryKey: QUERY_KEYS.ops.barsJobs })
    void qc.invalidateQueries({ queryKey: QUERY_KEYS.ops.aggregatedJobs })
    void qc.invalidateQueries({ queryKey: QUERY_KEYS.ops.queuesSummary })
  }
}

export function useDeleteAllBarsJobs() {
  const invalidate = useInvalidateJobQueries()
  return useMutation({
    mutationFn: (params: { status?: string }) => deleteAllBarsJobs(params.status),
    onSettled: invalidate,
  })
}

export function useRetryBarsJob() {
  const invalidate = useInvalidateJobQueries()
  return useMutation({
    mutationFn: (jobId: string) => postRetryBarsJob(jobId),
    onSettled: invalidate,
  })
}

export function useRetryFailedBarsJobs() {
  const invalidate = useInvalidateJobQueries()
  return useMutation({
    mutationFn: (limit?: number) => postRetryFailedBarsJobs(limit),
    onSettled: invalidate,
  })
}

export function useTrimBarsJobs() {
  const invalidate = useInvalidateJobQueries()
  return useMutation({
    mutationFn: (keep: number) => trimBarsJobs(keep),
    onSettled: invalidate,
  })
}
