import type { Execution } from '@/types/positions'
import { ledgerExecutionDateKey } from '@/utils/ledger/summaryPeriod'

export function fmtCcy(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export function fmtPrice(n: number | null | undefined): string {
  if (n == null) return '—'
  return n.toFixed(2)
}

export function pnlClass(n: number | null | undefined): string {
  if (n == null || n === 0) return 'text-muted-foreground'
  return n > 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'
}

export function fmtTsShort(ts: number): string {
  const d = new Date(ts * 1000)
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function fmtMdHint(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return iso
  return `${parseInt(m[2], 10)}/${parseInt(m[3], 10)}`
}

/** YYYYMMDD / YYYY-MM-DD → YYYY-MM-DD (Legacy ledger tables). */
export function fmtLedgerExpiry(expiry: string | null | undefined): string {
  if (!expiry?.trim()) return '—'
  const s = String(expiry).trim().replace(/\D/g, '')
  if (s.length === 8) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
  if (s.length === 6) return `${s.slice(0, 4)}-${s.slice(4, 6)}`
  return String(expiry).trim()
}

export function execMonthKey(e: Execution): string {
  const d = ledgerExecutionDateKey(e.trade_date ?? null, e.time)
  if (!d) return '0000-00'
  return d.slice(0, 7)
}
