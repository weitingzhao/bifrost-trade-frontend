import type { MassiveJobApiRow } from '@/types/ops'

export function latestJobForKind(jobs: MassiveJobApiRow[], kind: string): MassiveJobApiRow | undefined {
  const k = kind.toLowerCase()
  const match = (jk: string) => {
    const x = jk.toLowerCase()
    if (k === 'feed_option_snapshots') return x === 'feed_option_snapshots' || x === 'snapshot'
    if (k === 'feed_options_aggregate') return x === 'feed_options_aggregate' || x === 'aggregates'
    if (k === 'feed_option_contracts') return x === 'feed_option_contracts' || x === 'contracts'
    if (k === 'feed_stocks_corporate_action') {
      return x === 'feed_stocks_corporate_action' || x === 'corporate_action'
    }
    if (k === 'oi') return x === 'oi'
    return x === k
  }
  return jobs.find(j => match(j.kind || ''))
}

export function fmtJobResult(j: MassiveJobApiRow): string {
  const r = j.result as Record<string, unknown> | undefined
  if (!r || typeof r !== 'object') return '—'
  const err = r.error
  if (typeof err === 'string') return err
  const mode = r.mode as string | undefined
  if (mode === 'open_close' || mode === 'prev') {
    const s = r.summary as Record<string, unknown> | undefined
    if (s) {
      const parts: string[] = []
      if (s.open != null) parts.push(`O ${s.open}`)
      if (s.close != null) parts.push(`C ${s.close}`)
      if (s.high != null) parts.push(`H ${s.high}`)
      if (s.low != null) parts.push(`L ${s.low}`)
      if (s.volume != null) parts.push(`V ${s.volume}`)
      return parts.length ? `${mode}: ${parts.join(' / ')}` : mode
    }
    return mode
  }
  if (r.rows_written != null) {
    const s = r.summary as Record<string, unknown> | undefined
    const ivInfo = s?.rows_with_iv != null ? `, IV ${s.rows_with_iv}/${s.results_count ?? r.rows_written}` : ''
    const gkInfo = s?.rows_with_full_greeks != null ? `, full greeks ${s.rows_with_full_greeks}` : ''
    return `rows ${String(r.rows_written)}${ivInfo}${gkInfo}`
  }
  if (r.rows_upserted != null) return `upserted ${String(r.rows_upserted)}`
  if (r.bars_upserted != null) return `bars ${String(r.bars_upserted)}`
  if (r.message != null) return String(r.message)
  return '—'
}

export function jobEvidenceLine(j: MassiveJobApiRow | undefined): string {
  if (!j) return 'No recent job of this kind in the list (refresh Job queue).'
  return `Last job #${j.job_id}: ${j.status ?? '—'} — ${fmtJobResult(j)}`
}
