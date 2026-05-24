import { useQuery } from '@tanstack/react-query'
import { fetchMonitorStatus } from '@/api/monitor'

export function useMonitorStatus() {
  return useQuery({
    queryKey: ['monitor', 'status'],
    queryFn: fetchMonitorStatus,
    refetchInterval: 5_000,
  })
}
