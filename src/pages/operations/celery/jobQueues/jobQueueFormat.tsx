import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import type { BarsJob } from '@/types/ops'

export function fmtTs(ts: number | null | undefined): string {
  if (ts == null) return '—'
  return new Date(ts * 1000).toLocaleString()
}

export function statusBadge(status: string | undefined): ReactNode {
  const s = (status || '').toLowerCase()
  if (s === 'done') return <Badge variant="secondary">{status}</Badge>
  if (s === 'failed') return <Badge variant="destructive">{status}</Badge>
  if (s === 'running') return <Badge variant="default">{status}</Badge>
  return <Badge variant="outline">{status ?? '—'}</Badge>
}

export function fmtBarsResult(j: BarsJob): string {
  const r = j.result
  if (!r) return '—'
  if (r.error) return r.error
  if (r.count != null) return `${r.count} bars`
  if (r.message) return r.message
  return '—'
}
