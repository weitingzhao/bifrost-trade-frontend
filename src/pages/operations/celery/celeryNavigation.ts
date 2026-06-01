import type { WorkerSummary } from '@/types/ops'
import type { CeleryStatusFilter } from './celeryTypes'
import type { ConsoleTarget } from './CeleryRuntimeSnapshotSection'

export function resolveConsoleTargetForQueue(
  queue: string,
  workers: WorkerSummary[],
): ConsoleTarget {
  const q = queue.trim()
  const w = workers.find(x => (x.queues ?? []).includes(q))
  return w ? w.worker_id : 'broker'
}

export function parseConsoleParam(raw: string | null, workers: WorkerSummary[]): ConsoleTarget {
  if (!raw || raw === 'none') return 'none'
  if (raw === 'broker') return 'broker'
  const exists = workers.some(w => w.worker_id === raw)
  return exists ? raw : 'none'
}

export type CeleryNavigateHandlers = {
  navigateToQueue: (queue: string, status?: CeleryStatusFilter) => void
  navigateToConsoleForQueue: (queue: string) => void
  toggleSupportTasksFilter: (brokerKey: string) => void
  clearWorkerQueueFilter: () => void
}
