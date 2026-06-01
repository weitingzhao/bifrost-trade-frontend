import type { OpenOptionPosition, Execution } from '@/types/positions'
import type { QuoteItem } from '@/types/market'
import { pnlColorClass } from '@/utils/dailyChange'
import { rightLabel } from '@/utils/positions'

export type OpenOptSortCol =
  | 'contract'
  | 'expiry'
  | 'strike'
  | 'last'
  | 'qty'
  | 'avg_cost'
  | 'value'
  | 'time'
  | 'un_pnl'

export function optionExpiryMatchesFilter(expiryRaw: string, filterRaw: string): boolean {
  const f = filterRaw.replace(/\D/g, '')
  if (!f) return true
  const ex = (expiryRaw ?? '').replace(/\D/g, '')
  if (!ex) return false
  if (ex.length >= f.length) return ex.startsWith(f)
  return f.startsWith(ex)
}

export function getOptionsTabPositionKey(p: OpenOptionPosition): string {
  return `${p.contract_key}|${p.account_id}|${p.kind}`
}

export function getPositionTime(p: OpenOptionPosition): number | null {
  if (p.kind === 'live' && p.position) {
    const raw = p.position.price_updated_at ?? p.position.updated_at
    const ts = raw != null ? Number(raw) : null
    return ts != null && Number.isFinite(ts) ? ts : null
  }
  if (p.kind === 'offtrack' && p.trades?.length) {
    const ex = p.trades[0]
    const ts = ex.time != null ? Number(ex.time) : null
    return ts != null && Number.isFinite(ts) ? ts : null
  }
  return null
}

export function getPositionUnderlyingLast(
  p: OpenOptionPosition,
  quotesBySymbol: Record<string, QuoteItem>,
): number | null {
  const sym = (p.symbol ?? '').toUpperCase()
  if (!sym) return null
  const q = quotesBySymbol[sym]
  return q?.last != null && Number.isFinite(q.last) ? q.last : null
}

export function instanceIconFillFromMergedExecutions(
  merged: Execution[],
): 'empty' | 'none' | 'all' | 'mixed' {
  if (merged.length === 0) return 'empty'
  let withInstance = 0
  for (const ex of merged) {
    if (ex.strategy_instance_id != null) withInstance += 1
  }
  if (withInstance === 0) return 'none'
  if (withInstance === merged.length) return 'all'
  return 'mixed'
}

/** Signed color hint for last vs strike % (option position context). */
function optionStrikePctSign(right: string, side: 'Buy' | 'Sell', pct: number): number | null {
  if (pct === 0 || (right !== 'C' && right !== 'P')) return null
  const isSell = side === 'Sell'
  const positive = pct > 0
  const favorable =
    right === 'C'
      ? isSell
        ? !positive
        : positive
      : isSell
        ? positive
        : !positive
  return favorable ? 1 : -1
}

export function optionLastStrikePctClass(right: string, side: 'Buy' | 'Sell', pct: number): string {
  const sign = optionStrikePctSign(right, side, pct)
  if (sign == null) return ''
  return pnlColorClass(sign)
}

/** Same as optionLastStrikePctClass but infers side from signed qty. */
export function optionLastStrikePctClassFromQty(right: string, qty: number, pct: number): string {
  const side: 'Buy' | 'Sell' = qty < 0 ? 'Sell' : 'Buy'
  return optionLastStrikePctClass(right, side, pct)
}

export function optQuoteMid(quote: QuoteItem | undefined): number | null {
  if (!quote) return null
  if (quote.mid != null) return quote.mid
  if (quote.bid != null && quote.ask != null) return (quote.bid + quote.ask) / 2
  return quote.last ?? null
}

export function contractButtonLabel(pos: OpenOptionPosition): string {
  const strikeStr = pos.strike != null ? ` ${pos.strike}` : ''
  return `${pos.symbol} ${rightLabel(pos.right)}${strikeStr}`
}

export function sortOpenOptionPositions(
  list: OpenOptionPosition[],
  column: OpenOptSortCol,
  dir: 'asc' | 'desc',
  quotesBySymbol: Record<string, QuoteItem>,
): OpenOptionPosition[] {
  const out = [...list]
  const mult = dir === 'asc' ? 1 : -1
  out.sort((a, b) => {
    if (column === 'contract') {
      const cmp = a.symbol.localeCompare(b.symbol)
      if (cmp !== 0) return mult * cmp
      const cmpExp = a.expiry.localeCompare(b.expiry)
      if (cmpExp !== 0) return mult * cmpExp
      return mult * (a.strike - b.strike)
    }
    if (column === 'expiry') {
      const cmp = a.expiry.localeCompare(b.expiry)
      if (cmp !== 0) return mult * cmp
      return mult * a.symbol.localeCompare(b.symbol)
    }
    if (column === 'strike') {
      const cmp = a.strike - b.strike
      if (cmp !== 0) return mult * cmp
      return mult * a.symbol.localeCompare(b.symbol)
    }
    if (column === 'last') {
      const aLast = getPositionUnderlyingLast(a, quotesBySymbol) ?? -Infinity
      const bLast = getPositionUnderlyingLast(b, quotesBySymbol) ?? -Infinity
      if (aLast !== bLast) return mult * (aLast - bLast)
      return 0
    }
    if (column === 'qty') return mult * (Math.abs(a.qty) - Math.abs(b.qty))
    if (column === 'avg_cost') return mult * ((a.avg_cost ?? -Infinity) - (b.avg_cost ?? -Infinity))
    if (column === 'value') {
      const aVal = (a.avg_cost ?? 0) * Math.abs(a.qty) * 100
      const bVal = (b.avg_cost ?? 0) * Math.abs(b.qty) * 100
      return mult * (aVal - bVal)
    }
    if (column === 'time') return mult * ((getPositionTime(a) ?? 0) - (getPositionTime(b) ?? 0))
    return mult * (a.unrealized_pnl - b.unrealized_pnl)
  })
  return out
}
