import { useQuery } from '@tanstack/react-query'
import { fetchOpsWorkers, fetchOpsQueuesSummary } from '@/api/ops'
import { QUERY_KEYS } from '@/constants/queryKeys'
import {
  computeCeleryRuntimeLamp,
  celeryQueuePendingBadgeTotal,
  runtimeLampText,
} from '@/utils/celeryRuntime'
import type { CeleryRuntimeLamp } from '@/utils/celeryRuntime'

export interface CeleryHeaderMetrics {
  lamp: CeleryRuntimeLamp
  pendingTotal: number | null
  title: string
}

const POLL_MS = 10_000

export function useCeleryHeaderMetrics(enabled = true) {
  const workersQuery = useQuery({
    queryKey: QUERY_KEYS.ops.workers,
    queryFn: fetchOpsWorkers,
    refetchInterval: POLL_MS,
    enabled,
  })

  const queuesQuery = useQuery({
    queryKey: QUERY_KEYS.ops.queuesSummary,
    queryFn: fetchOpsQueuesSummary,
    refetchInterval: POLL_MS,
    enabled,
  })

  const workers = workersQuery.data?.workers ?? []
  const brokerConnected = workersQuery.data?.broker.connected === true
  const lamp = computeCeleryRuntimeLamp(brokerConnected, workers)
  const queues = queuesQuery.data?.queues ?? []
  const pendingTotal =
    queuesQuery.data?.ok && queues.length > 0 ? celeryQueuePendingBadgeTotal(queues) : null

  const title = `${runtimeLampText(lamp)} — Queue pending (Redis, deduped): ${pendingTotal ?? '—'}`

  return {
    lamp,
    pendingTotal,
    title,
    isLoading: workersQuery.isLoading || queuesQuery.isLoading,
  } satisfies CeleryHeaderMetrics & { isLoading: boolean }
}
