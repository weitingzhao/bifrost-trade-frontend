import type { IbPositionRow } from '@/types/monitor'
import type { PositionCategory } from '@/types/portfolio'
import type { QuoteItem, WatchlistItem } from '@/types/market'
import { fmtUsd } from '@/utils/positions'

export const WL_CAT_WATCHING = 'Watching'
export const WL_CAT_SIZING = 'Sizing'

export type PrimaryWorkflowTab = 'watching' | 'sizing' | 'positions'

export function categoryIdForName(cats: PositionCategory[], name: string): number | null {
  const n = name.trim().toLowerCase()
  const hit = cats.find(c => String(c.name ?? '').trim().toLowerCase() === n)
  return hit != null && Number.isFinite(Number(hit.id)) ? Number(hit.id) : null
}

export function itemMatchesCategory(
  item: WatchlistItem,
  name: string,
  resolvedId: number | null,
): boolean {
  if (resolvedId != null && item.category_id != null && Number(item.category_id) === resolvedId) return true
  return String(item.category ?? '').trim().toLowerCase() === name.trim().toLowerCase()
}

export function isStockRow(item: WatchlistItem): boolean {
  return (item.sec_type || 'STK').toUpperCase() !== 'OPT'
}

export function isUncategorizedStock(item: WatchlistItem): boolean {
  if (!isStockRow(item)) return false
  if (item.category_id != null && Number.isFinite(Number(item.category_id))) return false
  const cat = String(item.category ?? '').trim()
  return !cat || cat.toLowerCase() === 'uncategorized'
}

export function isUncategorizedOption(item: WatchlistItem): boolean {
  if ((item.sec_type || '').toUpperCase() !== 'OPT') return false
  if (item.category_id != null && Number.isFinite(Number(item.category_id))) return false
  const cat = String(item.category ?? '').trim()
  return !cat || cat.toLowerCase() === 'uncategorized'
}

export function normalizeToContractKey(input: string): {
  contract_key: string
  symbol?: string
  sec_type?: string
} {
  const t = input.trim()
  if (!t) return { contract_key: '' }
  if (t.includes('|')) return { contract_key: t }
  return { contract_key: `${t}|STK|||`, symbol: t, sec_type: 'STK' }
}

export function positionToContractKey(p: IbPositionRow): string {
  const ck = p.contract_key
  if (ck && typeof ck === 'string' && ck.trim()) return ck.trim()
  const sym = (p.symbol || '').trim()
  const sec = (p.secType || 'STK').trim() || 'STK'
  const exp = (p.expiry || p.lastTradeDateOrContractMonth || '').trim()
  const str = p.strike != null ? String(p.strike) : ''
  const rt = (p.right || '').trim()
  return `${sym}|${sec}|${exp}|${str}|${rt}`
}

export function watchlistItemLabel(item: WatchlistItem): string {
  if (item.display_label && String(item.display_label).trim()) return item.display_label.trim()
  if (item.sec_type === 'OPT' && item.symbol) {
    const exp = item.expiry || ''
    const right = item.option_right || ''
    const strike = item.strike != null ? String(item.strike) : ''
    return `${item.symbol} ${exp} ${right} ${strike}`.trim() || item.contract_key
  }
  return (item.symbol || item.contract_key || '').trim() || item.contract_key
}

export function symbolFromItem(item: WatchlistItem): string {
  if (item.symbol && String(item.symbol).trim()) return String(item.symbol).trim()
  const parts = (item.contract_key || '').split('|')
  return (parts[0] || '').trim()
}

export function formatExpiry(expiry: string | null | undefined): string {
  if (expiry == null || expiry === '') return '—'
  const s = String(expiry).trim()
  if (s.length === 8) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
  if (s.length === 6) return `${s.slice(0, 4)}-${s.slice(4, 6)}`
  return s
}

export function formatOptionRight(right: string | null | undefined): string {
  if (right == null || right === '') return '—'
  const r = String(right).trim().toUpperCase()
  if (r === 'C' || r === 'CALL') return 'C'
  if (r === 'P' || r === 'PUT') return 'P'
  return right
}

/** Live Watching Options: C → CALL, P → PUT (Legacy display). */
export function formatOptionRightLabel(right: string | null | undefined): string {
  if (right == null || right === '') return '—'
  const r = String(right).trim().toUpperCase()
  if (r === 'C' || r === 'CALL') return 'CALL'
  if (r === 'P' || r === 'PUT') return 'PUT'
  return right
}

export function formatStrike(strike: number | null | undefined): string {
  if (strike == null) return '—'
  const n = Number(strike)
  if (Number.isNaN(n)) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n)
}

export function normalizeExpiryInput(input: string): string {
  const s = input.trim().replace(/-/g, '')
  if (/^\d{8}$/.test(s)) return s
  if (/^\d{6}$/.test(s)) return s
  if (/^\d{4}-\d{2}-\d{2}$/.test(input.trim())) return input.trim().replace(/-/g, '')
  return input.trim()
}

export function quoteDisplayLast(q: QuoteItem | undefined): number | null {
  if (!q) return null
  const last = q.last != null ? Number(q.last) : NaN
  if (Number.isFinite(last) && last > 0) return last
  const mid = q.mid != null ? Number(q.mid) : NaN
  if (Number.isFinite(mid) && mid > 0) return mid
  return null
}

export function renderQuoteLastBidAsk(q: QuoteItem | undefined): {
  last: string
  bidAsk: string | null
} {
  if (!q) return { last: '—', bidAsk: null }
  const last = quoteDisplayLast(q)
  const bid = q.bid != null && Number.isFinite(q.bid) ? q.bid : null
  const ask = q.ask != null && Number.isFinite(q.ask) ? q.ask : null
  const lastStr = last != null ? fmtUsd(last) : '—'
  if (bid == null && ask == null) return { last: lastStr, bidAsk: null }
  const parts: string[] = []
  if (bid != null) parts.push(bid.toFixed(2))
  if (ask != null) parts.push(ask.toFixed(2))
  return { last: lastStr, bidAsk: parts.join(' / ') }
}

export function formatOrderInputNumber(v: number | null | undefined, digits = 2): string {
  if (v == null || !Number.isFinite(v)) return ''
  return String(Number(v.toFixed(digits)))
}

export function defaultShareAmt(shares: number | null | undefined): string {
  if (shares != null && Number.isFinite(shares) && shares > 0) {
    const conservativeHundreds = Math.floor(shares / 100) * 100
    return String(Math.max(100, conservativeHundreds || 100))
  }
  return '100'
}
