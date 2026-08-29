import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchMonitorStatus, fetchOperations } from '@/api/monitor'
import { QUERY_KEYS } from '@/constants/queryKeys'

export function useMonitorStatus() {
  return useQuery({
    queryKey: QUERY_KEYS.monitor.status,
    queryFn: fetchMonitorStatus,
    // Poll every 15s; use useInvalidateStatus() after commands for instant feedback.
    // Previously 5s — that combined with several other layout-level polls kept
    // Cursor's embedded browser main thread busy every second.
    refetchInterval: 15_000,
  })
}

export function useOperations(limit = 50) {
  return useQuery({
    queryKey: [...QUERY_KEYS.monitor.operations, limit],
    queryFn: () => fetchOperations(limit),
    refetchInterval: 15_000,
  })
}

export function useInvalidateStatus() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: QUERY_KEYS.monitor.status })
}
