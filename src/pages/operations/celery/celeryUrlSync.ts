import type { CeleryMainTab, CeleryStatusFilter } from './celeryTypes'
import { isCeleryMainTab } from './celeryTypes'
import type { ConsoleTarget } from './CeleryRuntimeSnapshotSection'

export const CELERY_QUEUE_HASH_PREFIX = 'settings-celery-queue-'

export interface CeleryUrlState {
  tab: CeleryMainTab
  queue: string | null
  status: CeleryStatusFilter | null
  brokerQueue: string | null
  console: ConsoleTarget | null
}

const STATUS_VALUES: CeleryStatusFilter[] = ['all', 'pending', 'running', 'done', 'failed']

function parseStatus(raw: string | null): CeleryStatusFilter | null {
  if (!raw) return null
  return STATUS_VALUES.includes(raw as CeleryStatusFilter) ? (raw as CeleryStatusFilter) : null
}

export function parseCelerySearchParams(searchParams: URLSearchParams): CeleryUrlState {
  const tabParam = searchParams.get('tab')
  const tab: CeleryMainTab = isCeleryMainTab(tabParam) ? tabParam : 'queues_instances'
  const queue = searchParams.get('queue')?.trim() || null
  const status = parseStatus(searchParams.get('status'))
  const brokerQueue = searchParams.get('broker_queue')?.trim() || null
  const consoleRaw = searchParams.get('console')?.trim()
  let consoleTarget: ConsoleTarget | null = null
  if (consoleRaw === 'broker') consoleTarget = 'broker'
  else if (consoleRaw && consoleRaw !== 'none') consoleTarget = consoleRaw

  return { tab, queue, status, brokerQueue, console: consoleTarget }
}

export type CeleryUrlPatch = Partial<{
  tab: CeleryMainTab | null
  queue: string | null
  status: CeleryStatusFilter | null
  brokerQueue: string | null
  console: ConsoleTarget | null
}>

export function applyCeleryUrlPatch(
  prev: URLSearchParams,
  patch: CeleryUrlPatch,
): URLSearchParams {
  const next = new URLSearchParams(prev)

  if ('tab' in patch) {
    const t = patch.tab
    if (!t || t === 'queues_instances') next.delete('tab')
    else next.set('tab', t)
  }

  if ('queue' in patch) {
    const q = patch.queue?.trim()
    if (q) next.set('queue', q)
    else next.delete('queue')
  }

  if ('status' in patch) {
    const s = patch.status
    if (s && s !== 'all') next.set('status', s)
    else next.delete('status')
  }

  if ('brokerQueue' in patch) {
    const b = patch.brokerQueue?.trim()
    if (b) next.set('broker_queue', b)
    else next.delete('broker_queue')
  }

  if ('console' in patch) {
    const c = patch.console
    if (!c || c === 'none') next.delete('console')
    else next.set('console', c === 'broker' ? 'broker' : c)
  }

  return next
}

/** Legacy hash → search params (one-time redirect). */
export function legacyHashToCelerySearchParams(hash: string): URLSearchParams | null {
  const h = hash.startsWith('#') ? hash.slice(1) : hash
  if (h === 'settings-celery-support-tasks') {
    return new URLSearchParams({ tab: 'support_tasks' })
  }
  if (h === 'settings-celery-scheduled-jobs') {
    return new URLSearchParams({ tab: 'scheduled_jobs' })
  }
  if (h === 'settings-celery' || h === 'settings-dashboard-celery') {
    return new URLSearchParams()
  }
  if (h.startsWith(CELERY_QUEUE_HASH_PREFIX)) {
    try {
      const raw = h.slice(CELERY_QUEUE_HASH_PREFIX.length).trim()
      const queue = raw ? decodeURIComponent(raw) : ''
      if (queue) return new URLSearchParams({ queue })
    } catch {
      return null
    }
  }
  return null
}

export function consoleTargetToParam(target: ConsoleTarget): string | null {
  if (target === 'none') return null
  if (target === 'broker') return 'broker'
  return target
}
