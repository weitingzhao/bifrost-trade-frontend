import type { ReactNode } from 'react'
import type { BarCoveragePeriod } from '@/types/barsCoverage'
import { fmtDate } from '@/utils/positions'

function coverageCountNum(p: { count: number }): number {
  const n = Number(p.count)
  return Number.isFinite(n) ? n : 0
}

function formatDay(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim())
  if (!m) return iso
  const d = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10))
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function epochToUtcIsoDate(ts: number): string {
  const d = new Date(ts)
  const y = d.getUTCFullYear()
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0')
  const da = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${mo}-${da}`
}

export function coverageCell(
  p: BarCoveragePeriod,
  options?: { dailySessionDates?: boolean },
): string {
  const cnt = coverageCountNum(p)
  if (cnt === 0) return '—'
  if (p.min_day && p.max_day) {
    return `${formatDay(p.min_day)} ~ ${formatDay(p.max_day)} (${cnt})`
  }
  const useUtc = Boolean(options?.dailySessionDates)
  if (p.min_ts != null && p.max_ts != null) {
    if (useUtc) {
      return `${formatDay(epochToUtcIsoDate(p.min_ts))} ~ ${formatDay(epochToUtcIsoDate(p.max_ts))} (${cnt})`
    }
    return `${fmtDate(p.min_ts)} ~ ${fmtDate(p.max_ts)} (${cnt})`
  }
  if (p.min_ts != null) return `${fmtDate(p.min_ts)} ~ — (${cnt})`
  if (p.max_ts != null) return `— ~ ${fmtDate(p.max_ts)} (${cnt})`
  return String(cnt)
}

export function coverageRange(p: BarCoveragePeriod, options?: { dailySessionDates?: boolean }): string {
  const cnt = coverageCountNum(p)
  if (cnt === 0) return '—'
  if (p.min_day && p.max_day) {
    return `${formatDay(p.min_day)}\n${formatDay(p.max_day)}`
  }
  const useUtc = Boolean(options?.dailySessionDates)
  if (p.min_ts != null && p.max_ts != null) {
    if (useUtc) {
      return `${formatDay(epochToUtcIsoDate(p.min_ts))}\n${formatDay(epochToUtcIsoDate(p.max_ts))}`
    }
    return `${fmtDate(p.min_ts)}\n${fmtDate(p.max_ts)}`
  }
  if (p.min_ts != null) return `${fmtDate(p.min_ts)}\n—`
  if (p.max_ts != null) return `—\n${fmtDate(p.max_ts)}`
  return '—'
}

export function coverageCompact(
  p: BarCoveragePeriod,
  needPull: boolean,
  isTradingDay: boolean | null,
): ReactNode {
  const cnt = coverageCountNum(p)
  if (cnt === 0) return '—'
  const showEnd = needPull && isTradingDay !== false
  if (!showEnd) return <>{cnt}</>
  return (
    <>
      {cnt} <span className="text-amber-600 dark:text-amber-500">(end)</span>
    </>
  )
}

export function coverageStatusDisplay(status: string | undefined): {
  label: string
  needBackfill: boolean
  severity: 'ok' | 'gap' | 'missing'
} {
  switch (status) {
    case 'ok':
      return { label: 'OK', needBackfill: false, severity: 'ok' }
    case 'missing':
      return { label: 'Missing', needBackfill: true, severity: 'missing' }
    case 'gap_start':
      return { label: 'Gap (start)', needBackfill: true, severity: 'gap' }
    case 'gap_end':
      return { label: 'Gap (end)', needBackfill: true, severity: 'gap' }
    case 'gap':
      return { label: 'Gap', needBackfill: true, severity: 'gap' }
    default:
      return { label: '', needBackfill: false, severity: 'ok' }
  }
}
