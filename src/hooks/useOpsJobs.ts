import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchAggregatedJobQueuesSummary,
  fetchOpsAudit,
  fetchMassiveJobsList,
  fetchBarsJobs,
  deleteAllMassiveJobs,
  deleteAllBarsJobs,
  postRetryMassiveJob,
  postRetryBarsJob,
  postRetryFailedMassiveJobs,
  postRetryFailedBarsJobs,
  trimMassiveJobs,
  trimBarsJobs,
} from '@/api/ops'
import { fetchMassiveCeleryBeatSchedule } from '@/api/research'
import { QUERY_KEYS } from '@/constants/queryKeys'

export interface MassiveJobsFilter {
  limit: number
  offset: number
  status?: string
  celery_queue?: string
}

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

export function useMassiveCeleryBeat() {
  return useQuery({
    queryKey: QUERY_KEYS.research.celeryBeat,
    queryFn: fetchMassiveCeleryBeatSchedule,
    staleTime: 120_000,
  })
}

export function useMassiveJobs(filter: MassiveJobsFilter) {
  return useQuery({
    queryKey: [...QUERY_KEYS.ops.massiveJobs, filter],
    queryFn: () => fetchMassiveJobsList(filter),
    refetchInterval: 10_000,
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
    void qc.invalidateQueries({ queryKey: QUERY_KEYS.ops.massiveJobs })
    void qc.invalidateQueries({ queryKey: QUERY_KEYS.ops.barsJobs })
    void qc.invalidateQueries({ queryKey: QUERY_KEYS.ops.aggregatedJobs })
    void qc.invalidateQueries({ queryKey: QUERY_KEYS.ops.queuesSummary })
  }
}

export function useDeleteAllMassiveJobs() {
  const invalidate = useInvalidateJobQueries()
  return useMutation({
    mutationFn: (params: { status?: string; celeryQueue?: string }) =>
      deleteAllMassiveJobs(params.status, params.celeryQueue),
    onSettled: invalidate,
  })
}

export function useDeleteAllBarsJobs() {
  const invalidate = useInvalidateJobQueries()
  return useMutation({
    mutationFn: (params: { status?: string }) => deleteAllBarsJobs(params.status),
    onSettled: invalidate,
  })
}

export function useRetryMassiveJob() {
  const invalidate = useInvalidateJobQueries()
  return useMutation({
    mutationFn: (jobId: string) => postRetryMassiveJob(jobId),
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

export function useRetryFailedMassiveJobs() {
  const invalidate = useInvalidateJobQueries()
  return useMutation({
    mutationFn: (params: { celeryQueue: string; limit?: number }) =>
      postRetryFailedMassiveJobs(params.celeryQueue, params.limit),
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

export function useTrimMassiveJobs() {
  const invalidate = useInvalidateJobQueries()
  return useMutation({
    mutationFn: (params: { keep: number; celeryQueue?: string }) =>
      trimMassiveJobs(params.keep, params.celeryQueue),
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
