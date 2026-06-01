import type { IbAccountSnapshot, IbPositionRow } from '@/types/monitor'
import type { QuoteItem, QuotesResponse, DailyBenchmark } from '@/types/market'

export function fmtUsd(n: number | null | undefined, round = false): string {
  if (n == null || isNaN(n)) return '—'
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: round ? 0 : 2,
    maximumFractionDigits: round ? 0 : 2,
  })
}

export function fmtPct(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '—'
  const sign = n >= 0 ? '+' : ''
  return `${sign}${n.toFixed(2)}%`
}

export function formatLastUpdate(ts: number | null | undefined): string {
  if (ts == null) return '—'
  const secs = Math.floor(Date.now() / 1000 - ts)
  if (secs < 90) return `${secs}s`
  const mins = Math.floor(secs / 60)
  if (mins < 90) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 36) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

export function fmtExpiry(s: string | undefined): string {
  if (!s) return '—'
  // YYYYMMDD → MM/DD/YY or YYYYMM → MM/YY
  if (s.length === 8) {
    return `${s.slice(4, 6)}/${s.slice(6, 8)}/${s.slice(2, 4)}`
  }
  if (s.length === 6) {
    return `${s.slice(4, 6)}/${s.slice(2, 4)}`
  }
  return s
}

export function rightLabel(r: string | undefined): 'Call' | 'Put' | '—' {
  if (r === 'C') return 'Call'
  if (r === 'P') return 'Put'
  return '—'
}

export function buildQuoteMap(data: QuotesResponse | undefined): Record<string, QuoteItem> {
  if (!data?.quotes) return {}
  const map: Record<string, QuoteItem> = {}
  for (const q of data.quotes) {
    if (q.symbol) map[q.symbol.toUpperCase()] = q
  }
  return map
}

export function buildCkMap(data: QuotesResponse | undefined): Record<string, QuoteItem> {
  if (!data?.quotes) return {}
  const map: Record<string, QuoteItem> = {}
  for (const q of data.quotes) {
    if (q.contract_key) map[q.contract_key] = q
  }
  return map
}

export function uniqueSymbols(accounts: IbAccountSnapshot[]): string[] {
  const set = new Set<string>()
  for (const acc of accounts) {
    for (const pos of acc.positions ?? []) {
      if (pos.secType?.toUpperCase() === 'STK' && pos.symbol) set.add(pos.symbol.toUpperCase())
    }
  }
  return [...set]
}

export function uniqueContractKeys(accounts: IbAccountSnapshot[]): string[] {
  const set = new Set<string>()
  for (const acc of accounts) {
    for (const pos of acc.positions ?? []) {
      if (pos.secType?.toUpperCase() === 'OPT' && pos.contract_key) set.add(pos.contract_key)
    }
  }
  return [...set]
}

export function resolveBasePrice(
  pos: IbPositionRow,
  bench: DailyBenchmark | undefined
): number | null {
  if (pos.daily_prev_close != null) return pos.daily_prev_close
  if (bench == null) return null
  if (bench.is_today && bench.prev_close != null) return bench.prev_close
  return bench.close
}

export function fmtExecDaysAgo(days: number | null | undefined): string {
  if (days == null) return '—'
  if (days < 0.5) return 'Today'
  if (days < 1.5) return '1 day ago'
  return `${Math.round(days)} days ago`
}

/** Legacy PnL colors (#22c55e / #ef4444) — see positionsTheme + *Legacy.css for table overrides. */
export function pnlColorClass(n: number | null | undefined): string {
  if (n == null) return ''
  if (n > 0) return 'pnl-positive'
  if (n < 0) return 'pnl-negative'
  return ''
}

export function daysUntilExpiry(expiry: string | undefined): number | null {
  if (!expiry) return null
  const digits = expiry.replace(/\D/g, '')
  if (digits.length < 8) return null
  const y = parseInt(digits.slice(0, 4))
  const m = parseInt(digits.slice(4, 6)) - 1
  const d = parseInt(digits.slice(6, 8))
  const target = new Date(y, m, d)
  target.setHours(16, 0, 0, 0)
  const now = new Date()
  const diff = target.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function fmtDate(epoch: number | null | undefined): string {
  if (epoch == null || !Number.isFinite(epoch)) return '—'
  return new Date(epoch * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function fmtDaysAgo(epoch: number | null | undefined): string | null {
  if (epoch == null || !Number.isFinite(epoch)) return null
  const secs = Math.floor(Date.now() / 1000 - epoch)
  if (secs < 60) return 'just now'
  const days = Math.floor(secs / 86400)
  if (days === 0) return 'today'
  if (days === 1) return '1d ago'
  if (days < 365) return `${days}d ago`
  return null
}

export function fmtSignedPct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
}
