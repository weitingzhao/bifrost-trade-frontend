import type { Execution } from '@/types/positions'
import { ledgerExecutionDateKey } from '@/utils/ledger/summaryPeriod'

export function fmtCcy(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export function fmtPrice(n: number | null | undefined): string {
  if (n == null) return '—'
  return n.toFixed(2)
}

export function pnlClass(n: number): string {
  return n >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'
}

export function fmtMdHint(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return iso
  return `${parseInt(m[2], 10)}/${parseInt(m[3], 10)}`
}

export function execMonthKey(e: Execution): string {
  const d = ledgerExecutionDateKey(e.trade_date ?? null, e.time)
  if (!d) return '0000-00'
  return d.slice(0, 7)
}
