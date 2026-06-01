import type { QueueSummaryRow, WorkerSummary } from '@/types/ops'
import {
  BROKER_QUEUE_STOCKS_IB,
  BROKER_QUEUE_OPTIONS_MASSIVE,
  BROKER_QUEUE_OPTIONS_MASSIVE_HIGH,
  BROKER_QUEUE_STOCKS_MASSIVE,
  BROKER_QUEUE_STOCKS_MASSIVE_HIGH,
} from './celeryQueueLabels'

export const SUPPORTED_CELERY_QUEUE_NAMES = [
  BROKER_QUEUE_STOCKS_IB,
  BROKER_QUEUE_STOCKS_MASSIVE_HIGH,
  BROKER_QUEUE_STOCKS_MASSIVE,
  BROKER_QUEUE_OPTIONS_MASSIVE_HIGH,
  BROKER_QUEUE_OPTIONS_MASSIVE,
] as const

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

const MASSIVE_LIKE_QUEUE_NAMES = [
  BROKER_QUEUE_OPTIONS_MASSIVE,
  BROKER_QUEUE_OPTIONS_MASSIVE_HIGH,
  BROKER_QUEUE_STOCKS_MASSIVE,
  BROKER_QUEUE_STOCKS_MASSIVE_HIGH,
] as const

type MassiveLikeQueue = (typeof MASSIVE_LIKE_QUEUE_NAMES)[number]

/** Deduped totals for the Queue summary footer row (bars + one massive row for done/failed). */
export function dedupedQueueSummaryTotals(rows: QueueSummaryRow[]): {
  pending_broker: number | null
  running_celery: number | null
  done_db: number | null
  failed_db: number | null
} {
  const massivePrimary =
    rows.find(r => r.name === BROKER_QUEUE_OPTIONS_MASSIVE) ??
    rows.find(r => MASSIVE_LIKE_QUEUE_NAMES.includes(r.name as MassiveLikeQueue))

  let pb = 0
  let pbHas = false
  for (const row of rows) {
    const p = row.pending_broker
    if (p != null && Number.isFinite(p)) {
      pb += p
      pbHas = true
    }
  }

  const bars = rows.find(r => r.name === BROKER_QUEUE_STOCKS_IB)
  let rc = 0
  let rcHas = false

  const barRun = bars?.running_celery
  if (barRun != null && Number.isFinite(barRun)) { rc += barRun; rcHas = true }

  const massiveRun =
    rows.find(r => r.name === BROKER_QUEUE_OPTIONS_MASSIVE)?.running_celery ??
    MASSIVE_LIKE_QUEUE_NAMES.map(n => rows.find(r => r.name === n)?.running_celery).find(
      x => x != null && Number.isFinite(x as number),
    )
  if (massiveRun != null && Number.isFinite(massiveRun)) { rc += massiveRun; rcHas = true }

  for (const row of rows) {
    if (
      row.name === BROKER_QUEUE_STOCKS_IB ||
      MASSIVE_LIKE_QUEUE_NAMES.includes(row.name as MassiveLikeQueue)
    ) continue
    const x = row.running_celery
    if (x != null && Number.isFinite(x)) { rc += x; rcHas = true }
  }

  const done_db = massivePrimary?.done_db ?? null
  const failed_db = massivePrimary?.failed_db ?? null

  return {
    pending_broker: pbHas ? pb : null,
    running_celery: rcHas ? rc : null,
    done_db: done_db != null && Number.isFinite(done_db) ? done_db : null,
    failed_db: failed_db != null && Number.isFinite(failed_db) ? failed_db : null,
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
