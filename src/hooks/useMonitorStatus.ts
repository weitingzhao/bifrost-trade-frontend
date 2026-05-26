import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchMonitorStatus, fetchOperations } from '@/api/monitor'

export function useMonitorStatus() {
  return useQuery({
    queryKey: ['monitor', 'status'],
    queryFn: fetchMonitorStatus,
    refetchInterval: 5_000,
  })
}

export function useOperations(limit = 50) {
  return useQuery({
    queryKey: ['monitor', 'operations', limit],
    queryFn: () => fetchOperations(limit),
    refetchInterval: 15_000,
  })
}

export function useInvalidateStatus() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ['monitor', 'status'] })
}
