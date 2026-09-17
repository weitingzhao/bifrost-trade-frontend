import type { Execution } from '@/types/positions'
import type { PerformanceDayPnLBulkResult } from '@/types/trading'
import { executionDateStr } from '@/utils/ledger/performanceUtils'
import { fmtSignedUsd0 } from './performanceReading'

export interface DayStat {
  label: string
  value: string
  raw: number | null
  /** pnl: direction ink · soft: a figure with no direction (unrealized, inventory) · muted: cost. */
  tone: 'pnl' | 'soft' | 'muted' | 'plain'
  title?: string
}

/**
 * The strip above a day's records: the same day read on every layer the page
 * has. Day P&L is realized across the four layers less the day's commissions;
 * unrealized and unpaired premium stand beside it and are never added in.
 */
export function buildDayStats(bulk: PerformanceDayPnLBulkResult | undefined, day: string): DayStat[] {
  const cell = (layer: string) => bulk?.calendarDayPnLByAsset?.[layer]?.[day]
  const optR = cell('options')?.realized ?? 0
  const optU = cell('options')?.unrealized ?? 0
  const stkR = cell('stocks')?.realized ?? 0
  const fiR = cell('fixed_income')?.realized ?? 0
  const cashR = cell('cash_like')?.realized ?? 0
  const fills: Execution[] = (bulk?.rawExecsWindow ?? []).filter((e) => executionDateStr(e) === day)
  const comm = fills.reduce((s, e) => s + Math.abs(Number(e.commission) || 0), 0)
  const open = bulk?.byDayRangeData?.optOpenByDay?.[day] ?? null
  const dayPnl = optR + stkR + fiR + cashR - comm

  return [
    {
      label: 'Day P&L',
      value: fmtSignedUsd0(dayPnl),
      raw: dayPnl,
      tone: 'pnl',
      title: 'Realized on options, stocks, fixed income and cash-like, less the day’s commissions',
    },
    { label: 'Options realized', value: fmtSignedUsd0(optR), raw: optR, tone: 'pnl' },
    { label: 'Options unrealized', value: fmtSignedUsd0(optU), raw: optU, tone: 'soft', title: 'Premium from the day’s fills still unmatched — not added to Day P&L' },
    { label: 'Stocks realized', value: stkR === 0 ? '—' : fmtSignedUsd0(stkR), raw: stkR, tone: 'pnl' },
    { label: 'Unpaired premium', value: fmtSignedUsd0(open), raw: open, tone: 'soft', title: 'Option premium still unpaired as of this day — an inventory' },
    { label: 'Comm', value: fmtSignedUsd0(-comm), raw: -comm, tone: 'muted' },
    { label: 'Trades', value: String(fills.length), raw: fills.length, tone: 'plain' },
  ]
}

/** Whole days between two `YYYY-MM-DD` dates, `later − earlier`. */
export function daysBetween(earlier: string, later: string): number {
  const a = Date.UTC(Number(earlier.slice(0, 4)), Number(earlier.slice(5, 7)) - 1, Number(earlier.slice(8, 10)))
  const b = Date.UTC(Number(later.slice(0, 4)), Number(later.slice(5, 7)) - 1, Number(later.slice(8, 10)))
  return Math.round((b - a) / 86_400_000)
}

/** `$1.1k` · `-$513` · `$953`: a calendar cell has room for three or four characters of figure. */
export function fmtCellMoney(v: number): string {
  const sign = v < 0 ? '-' : ''
  const a = Math.abs(v)
  if (a >= 1_000_000) return `${sign}$${(a / 1_000_000).toFixed(1)}M`
  if (a >= 1000) return `${sign}$${(a / 1000).toFixed(1)}k`
  return `${sign}$${Math.round(a)}`
}
