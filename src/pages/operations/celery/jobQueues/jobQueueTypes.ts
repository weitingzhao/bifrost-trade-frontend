import type { WorkerProfileInfo } from '@/types/ops'
import {
  BROKER_QUEUE_OPTIONS_MASSIVE,
  BROKER_QUEUE_OPTIONS_MASSIVE_HIGH,
  BROKER_QUEUE_STOCKS_IB,
  BROKER_QUEUE_STOCKS_MASSIVE,
  BROKER_QUEUE_STOCKS_MASSIVE_HIGH,
  formatQueueLabel,
} from '@/utils/celeryQueueLabels'
import type { CeleryStatusFilter } from '../celeryTypes'

export interface JobQueueTab {
  id: string
  label: string
  celeryQueue: string
  pipeline: 'stocks_ib' | 'massive_async'
}

export const FALLBACK_TABS: JobQueueTab[] = [
  { id: 'stocks_ib', label: formatQueueLabel(BROKER_QUEUE_STOCKS_IB), celeryQueue: BROKER_QUEUE_STOCKS_IB, pipeline: 'stocks_ib' },
  { id: 'options_massive', label: formatQueueLabel(BROKER_QUEUE_OPTIONS_MASSIVE), celeryQueue: BROKER_QUEUE_OPTIONS_MASSIVE, pipeline: 'massive_async' },
  { id: 'options_massive_high', label: formatQueueLabel(BROKER_QUEUE_OPTIONS_MASSIVE_HIGH), celeryQueue: BROKER_QUEUE_OPTIONS_MASSIVE_HIGH, pipeline: 'massive_async' },
  { id: 'stocks_massive', label: formatQueueLabel(BROKER_QUEUE_STOCKS_MASSIVE), celeryQueue: BROKER_QUEUE_STOCKS_MASSIVE, pipeline: 'massive_async' },
  { id: 'stocks_massive_high', label: formatQueueLabel(BROKER_QUEUE_STOCKS_MASSIVE_HIGH), celeryQueue: BROKER_QUEUE_STOCKS_MASSIVE_HIGH, pipeline: 'massive_async' },
]

export function tabsFromProfiles(profiles: WorkerProfileInfo[]): JobQueueTab[] {
  const out: JobQueueTab[] = []
  const seenQueues = new Set<string>()
  for (const p of profiles) {
    const qs = (p.queues ?? []).map(q => String(q).trim()).filter(Boolean)
    if (qs.length === 0) continue
    for (const q of qs) {
      if (seenQueues.has(q)) continue
      seenQueues.add(q)
      const id = qs.length > 1 ? `${p.key}__${q}` : p.key
      out.push({
        id,
        label: qs.length > 1 ? `${p.label} (${q})` : p.label,
        celeryQueue: q,
        pipeline: q === 'stocks_ib' ? 'stocks_ib' : 'massive_async',
      })
    }
  }
  return out
}

export type StatusFilter = CeleryStatusFilter

export interface ConfirmState {
  title: string
  message: string
  confirmLabel?: string
  action: () => Promise<void>
}

export const LIMIT_OPTIONS = [10, 25, 50, 100] as const
