import { useQuery } from '@tanstack/react-query'
import { fetchRiskSummary } from '@/api/monitor'
import { QUERY_KEYS } from '@/constants/queryKeys'

const REFRESH_MS = 30_000

export function useRiskSummary() {
  return useQuery({
    queryKey: QUERY_KEYS.monitor.riskSummary,
    queryFn: fetchRiskSummary,
    refetchInterval: REFRESH_MS,
  })
}
