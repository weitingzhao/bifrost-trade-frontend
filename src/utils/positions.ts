import { fmtUsd as fmtUsdCanonical, fmtUsdRound } from '@/lib/format'
import type { IbAccountSnapshot } from '@/types/monitor'
import type { QuoteItem, QuotesResponse } from '@/types/market'

export function fmtUsd(n: number | null | undefined, round = false): string {
  return round ? fmtUsdRound(n) : fmtUsdCanonical(n)
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

/** IB Gateway ticks use ``ts``; some rows still send ``timestamp``. */
export function quoteTimestamp(q: QuoteItem | undefined): number | null {
  if (!q) return null
  for (const v of [q.timestamp, q.ts, q.updated_ts]) {
    if (v != null && Number.isFinite(v)) return v
  }
  return null
}

/**
 * Age of the quote feed in seconds, from the freshest timestamp it carried.
 *
 * This measures the GATEWAY CACHE, not price freshness. Measured 2026-09-05
 * against DEV: two polls six seconds apart moved every quote's ``ts`` by 6.05s
 * while ``last`` stayed null throughout — the cache stamps a write on each poll
 * whether or not a price arrived. So a small number here means the quote path is
 * alive; it does not mean any particular price is current, and nothing should be
 * coloured "safe" on the strength of it. Judging whether a *price* is stale needs
 * a field this payload does not carry yet.
 *
 * Returns null when no quote carried a timestamp — unknown age, not fresh.
 */
export function quoteFeedAgeSec(
  quotes: Iterable<QuoteItem>,
  nowMs: number = Date.now(),
): number | null {
  let newestMs: number | null = null
  for (const q of quotes) {
    const t = quoteTimestamp(q)
    if (t == null) continue
    // Gateway stamps seconds; tolerate a millisecond stamp without inventing an age.
    const ms = t > 1e12 ? t : t * 1000
    if (newestMs == null || ms > newestMs) newestMs = ms
  }
  if (newestMs == null) return null
  return Math.max(0, Math.round((nowMs - newestMs) / 1000))
}

function isOptQuote(q: QuoteItem): boolean {
  const sec = (q.sec_type ?? '').trim().toUpperCase()
  if (sec === 'OPT') return true
  if (sec === 'STK') return false
  const ck = (q.contract_key ?? '').toUpperCase()
  return ck.includes('|OPT|')
}

/** Symbol → STK quote only. OPT rows share ``symbol`` and must not overwrite Last. */
export function buildQuoteMap(data: QuotesResponse | undefined): Record<string, QuoteItem> {
  if (!data?.quotes) return {}
  const map: Record<string, QuoteItem> = {}
  for (const q of data.quotes) {
    if (!q.symbol || isOptQuote(q)) continue
    map[q.symbol.toUpperCase()] = q
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

/**
 * Root symbols of held options.
 *
 * `uniqueSymbols` only walks STK rows, so a cash-secured put on a symbol you do
 * not own shares of never got its underlying quoted — and moneyness has nothing
 * to compare the strike against. Snapshot OPT rows carry the root symbol
 * directly (``'CBRS'``, not the OCC string), so no parsing is needed here.
 */
export function uniqueOptionUnderlyings(accounts: IbAccountSnapshot[]): string[] {
  const set = new Set<string>()
  for (const acc of accounts) {
    for (const pos of acc.positions ?? []) {
      if (pos.secType?.toUpperCase() === 'OPT' && pos.symbol) set.add(pos.symbol.toUpperCase())
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

/** @deprecated Import resolveDailyBasePrice from @/utils/dailyChange. */
export { resolveDailyBasePrice as resolveBasePrice } from '@/utils/dailyChange'

export function fmtExecDaysAgo(days: number | null | undefined): string {
  if (days == null) return '—'
  if (days < 0.5) return 'Today'
  if (days < 1.5) return '1 day ago'
  return `${Math.round(days)} days ago`
}

/** @deprecated Import from `@/utils/dailyChange` in new code. Re-export for existing call sites. */
export { pnlColorClass, unrealizedPnlColorClass } from '@/utils/dailyChange'

/**
 * Calendar days until an option expires. 0 means it expires today.
 *
 * Counts dates, not elapsed hours. The previous version anchored on 16:00 of the
 * expiry date and rounded the fraction up, so at 09:30 on expiry Friday a
 * contract expiring that afternoon reported ``1`` — and only became ``0`` after
 * the close, once it no longer mattered. Every reader of this treats 0 as "today"
 * and negative as "already gone", so the off-by-one landed on exactly the
 * contracts a seller acts on first.
 *
 * Rounding after the subtraction keeps DST-length days (23h / 25h) on whole days.
 */
export function daysUntilExpiry(expiry: string | undefined): number | null {
  if (!expiry) return null
  const digits = expiry.replace(/\D/g, '')
  if (digits.length < 8) return null
  const y = parseInt(digits.slice(0, 4))
  const m = parseInt(digits.slice(4, 6)) - 1
  const d = parseInt(digits.slice(6, 8))
  const target = new Date(y, m, d)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
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

/** Today in the local calendar, as the vendor stamps dates. */
export function localDayStamp(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`
}
