import { useQuery } from '@tanstack/react-query'
import { fetchAggregatedJobQueuesSummary, fetchOpsAudit } from '@/api/ops'
import { fetchMarketDataPluginCeleryBeatSchedule } from '@/api/research'
import { QUERY_KEYS } from '@/constants/queryKeys'

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
