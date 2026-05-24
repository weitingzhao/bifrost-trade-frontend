import { useQuery } from '@tanstack/react-query'
import { fetchOpsWorkers, fetchOpsQueuesSummary } from '@/api/ops'

export function useOpsWorkers() {
  return useQuery({
    queryKey: ['ops', 'workers'],
    queryFn: fetchOpsWorkers,
    refetchInterval: 10_000,
  })
}

export function useOpsQueuesSummary() {
  return useQuery({
    queryKey: ['ops', 'queues', 'summary'],
    queryFn: fetchOpsQueuesSummary,
    refetchInterval: 10_000,
  })
}
