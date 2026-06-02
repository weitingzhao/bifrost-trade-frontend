import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import type { BarsJob, MassiveJobApiRow } from '@/types/ops'

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

export function fmtMassiveResult(j: MassiveJobApiRow): string {
  const r = j.result as Record<string, unknown> | undefined
  if (!r || typeof r !== 'object') return '—'
  const err = r.error
  if (typeof err === 'string') return err
  if (r.rows_written != null) return `rows ${String(r.rows_written)}`
  if (r.rows_upserted != null) return `upserted ${String(r.rows_upserted)}`
  if (r.bars_upserted != null) return `bars ${String(r.bars_upserted)}`
  if (r.message != null) return String(r.message)
  return '—'
}

export function fmtMassiveResultDetail(j: MassiveJobApiRow): string {
  const r = j.result as Record<string, unknown> | undefined
  const sum = r?.summary as Record<string, unknown> | undefined
  if (!sum) return ''
  const parts: string[] = []
  if (sum.targets_found != null) parts.push(`targets ${String(sum.targets_found)}`)
  if (sum.contracts_ok != null) parts.push(`contracts_ok ${String(sum.contracts_ok)}`)
  if (sum.pct != null) parts.push(`${String(sum.pct)}%`)
  if (sum.processed != null && sum.total_symbols != null) {
    parts.push(`${String(sum.processed)}/${String(sum.total_symbols)}`)
  }
  let out = parts.join(' · ')
  if (out.length > 200) out = `${out.slice(0, 197)}…`
  return out
}

export function fmtBarsResult(j: BarsJob): string {
  const r = j.result
  if (!r) return '—'
  if (r.error) return r.error
  if (r.count != null) return `${r.count} bars`
  if (r.message) return r.message
  return '—'
}
