import type { WorkerStatus } from '@/types/ops'

export type WorkerLampColor = 'green' | 'yellow' | 'red' | 'none'

export function workerLamp(status: WorkerStatus | string): WorkerLampColor {
  if (status === 'running_healthy') return 'green'
  if (status === 'running_degraded' || status === 'starting' || status === 'stopping') return 'yellow'
  if (status === 'stopped' || status === 'failed') return 'red'
  return 'none'
}

export function workerStatusLabel(status: WorkerStatus | string): string {
  const map: Record<string, string> = {
    running_healthy: 'Healthy',
    running_degraded: 'Degraded',
    starting: 'Starting',
    stopping: 'Stopping',
    stopped: 'Stopped',
    failed: 'Failed',
    unknown: 'Unknown',
  }
  return map[status] ?? status
}

/** Relative time since unix epoch seconds. */
export function fmtRelativeEpoch(epochSec: number | null): string {
  if (epochSec == null) return '—'
  const delta = Date.now() / 1000 - epochSec
  if (delta < 0) return 'just now'
  if (delta < 60) return `${Math.floor(delta)}s ago`
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`
  if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`
  return `${Math.floor(delta / 86400)}d ago`
}

export function workerHostFromWorkerId(workerId: string): string | null {
  const i = workerId.indexOf('@')
  if (i < 0 || i >= workerId.length - 1) return null
  return workerId.slice(i + 1).trim() || null
}

export function workerIdToInstanceId(workerId: string): string | null {
  const node = workerId.split('@')[0]?.trim() ?? ''
  if (node.startsWith('worker') && node.length > 'worker'.length) {
    return node.slice('worker'.length)
  }
  return null
}
