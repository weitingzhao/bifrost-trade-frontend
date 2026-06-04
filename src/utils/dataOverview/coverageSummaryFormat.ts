import type { DbCoverageSummaryRow } from '@/types/watchlistDbCoverage'

export function fmtAgeSeconds(sec: number | null | undefined): string {
  if (sec == null || !Number.isFinite(sec)) return '—'
  const s = Math.max(0, Math.floor(sec))
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  const h = Math.floor(s / 3600)
  const d = Math.floor(h / 24)
  const hr = h % 24
  const min = Math.floor((s % 3600) / 60)
  if (d > 0) return `${d}d ${hr}h ago`
  if (h > 0) return `${h}h ${min}m ago`
  return `${m}m ago`
}

export function isoAgeSeconds(iso: string | null | undefined): number | null {
  if (!iso) return null
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return null
  return Math.max(0, Math.floor((Date.now() - t) / 1000))
}

export function globalRowFreshness(row: DbCoverageSummaryRow): string {
  if (row.error) return '—'
  const act = row.newest_activity
  if (act) return fmtAgeSeconds(isoAgeSeconds(act))
  const td = row.newest_trade_date
  if (td && td.length >= 10) {
    const t = Date.parse(`${td.slice(0, 10)}T12:00:00.000Z`)
    if (Number.isFinite(t)) return fmtAgeSeconds(Math.max(0, Math.floor((Date.now() - t) / 1000)))
  }
  return '—'
}

export function fmtCrontabUtc(c: Record<string, string | number>): string {
  const h = c.hour
  const m = c.minute ?? 0
  return `hour=${String(h)} minute=${String(m)}`
}

export function fmtJobTs(ts: number | undefined): string {
  if (ts == null || !Number.isFinite(ts)) return '—'
  const d = new Date(ts * 1000)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toISOString().slice(0, 16).replace('T', ' ')
}
