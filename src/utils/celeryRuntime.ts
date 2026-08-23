import type { QueueSummaryRow, WorkerSummary } from '@/types/ops'

export const SUPPORTED_CELERY_QUEUE_NAMES = [] as const

export type CeleryRuntimeLamp = 'green' | 'yellow' | 'red' | 'none'

export function workersCoverAllQueues(
  workers: Pick<WorkerSummary, 'queues'>[],
  required: string[],
): boolean {
  if (required.length === 0) return true
  const covered = new Set<string>()
  for (const w of workers) {
    for (const q of w.queues ?? []) {
      if (q) covered.add(q)
    }
  }
  return required.every(q => covered.has(q))
}

/**
 * Red: broker not connected.
 * Yellow: broker OK but no workers or workers don't collectively cover all supported queues.
 * Green: broker OK + at least one worker + all queues covered.
 */
export function computeCeleryRuntimeLamp(
  brokerConnected: boolean,
  workers: Pick<WorkerSummary, 'queues'>[],
): CeleryRuntimeLamp {
  if (!brokerConnected) return 'red'
  if (workers.length === 0) return 'yellow'
  const required = [...SUPPORTED_CELERY_QUEUE_NAMES]
  if (!workersCoverAllQueues(workers, required)) return 'yellow'
  return 'green'
}

export function runtimeLampText(lamp: CeleryRuntimeLamp): string {
  if (lamp === 'green') return 'Broker connected, all queues covered'
  if (lamp === 'yellow') return 'Broker connected but some queues have no consumer'
  if (lamp === 'red') return 'Broker not connected'
  return ''
}

/** Deduped totals for the Queue summary footer row. */
export function dedupedQueueSummaryTotals(rows: QueueSummaryRow[]): {
  pending_broker: number | null
  running_celery: number | null
  done_db: number | null
  failed_db: number | null
} {
  let pb = 0
  let pbHas = false
  let rc = 0
  let rcHas = false
  let done_db: number | null = null
  let failed_db: number | null = null

  for (const row of rows) {
    const p = row.pending_broker
    if (p != null && Number.isFinite(p)) {
      pb += p
      pbHas = true
    }
    const x = row.running_celery
    if (x != null && Number.isFinite(x)) {
      rc += x
      rcHas = true
    }
    if (row.done_db != null && Number.isFinite(row.done_db)) {
      done_db = (done_db ?? 0) + row.done_db
    }
    if (row.failed_db != null && Number.isFinite(row.failed_db)) {
      failed_db = (failed_db ?? 0) + row.failed_db
    }
  }

  return {
    pending_broker: pbHas ? pb : null,
    running_celery: rcHas ? rc : null,
    done_db,
    failed_db,
  }
}

/** Header badge: deduped Redis pending_broker total (same as Queue summary Total R column). */
export function celeryQueuePendingBadgeTotal(rows: QueueSummaryRow[]): number | null {
  const t = dedupedQueueSummaryTotals(rows)
  return t.pending_broker
}

/** Coverage lamp for a single queue. */
export function queueCoverageLamp(
  queueName: string,
  brokerConnected: boolean | undefined,
  workers: Pick<WorkerSummary, 'queues'>[],
): { lamp: CeleryRuntimeLamp; title: string } {
  if (brokerConnected !== true) return { lamp: 'red', title: 'Broker not connected' }
  const covered = workers.some(w => (w.queues ?? []).includes(queueName))
  if (covered) return { lamp: 'green', title: `Workers consuming "${queueName}"` }
  return { lamp: 'yellow', title: `No worker consuming "${queueName}" in current snapshot` }
}
