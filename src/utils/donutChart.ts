import type { LivePositionRow } from '@/types/positions'
import { isLedgerFixedIncomeCategory, isLedgerCashLikeCategory, ibPositionMarketValue } from './stockCategories'

export interface DonutSegment {
  label: string
  value: number
  color: string
}

const PALETTE = [
  '#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6',
  '#ef4444', '#06b6d4', '#ec4899', '#14b8a6',
  '#f97316', '#6366f1', '#84cc16', '#a855f7',
]

export function assignColor(index: number): string {
  return PALETTE[index % PALETTE.length]
}

export function buildAssetMixSegments(
  stocks: LivePositionRow[],
  options: LivePositionRow[],
  totalCash: number,
): DonutSegment[] {
  let coreMV = 0
  let fiMV = 0
  let cashLikeMV = 0
  let optMV = 0

  for (const pos of stocks) {
    const cat = String(pos.category ?? '').trim()
    const mv = ibPositionMarketValue(pos)
    if (isLedgerFixedIncomeCategory(cat)) fiMV += mv
    else if (isLedgerCashLikeCategory(cat)) cashLikeMV += mv
    else coreMV += mv
  }

  for (const pos of options) {
    optMV += ibPositionMarketValue(pos)
  }

  const segments: DonutSegment[] = []
  if (coreMV > 0) segments.push({ label: 'Stock', value: coreMV, color: '#22c55e' })
  if (fiMV > 0) segments.push({ label: 'Fixed Income', value: fiMV, color: '#f59e0b' })
  const cashTotal = Math.max(0, totalCash) + cashLikeMV
  if (cashTotal > 0) segments.push({ label: 'Cash + Cash-like', value: cashTotal, color: '#3b82f6' })
  if (optMV > 0) segments.push({ label: 'Options', value: optMV, color: '#8b5cf6' })

  return segments
}

export function buildSymbolDonutSegments(stocks: LivePositionRow[]): DonutSegment[] {
  const bySymbol = new Map<string, number>()

  for (const pos of stocks) {
    const sym = (pos.symbol ?? '').toUpperCase()
    if (!sym) continue
    const mv = ibPositionMarketValue(pos)
    bySymbol.set(sym, (bySymbol.get(sym) ?? 0) + mv)
  }

  const entries = [...bySymbol.entries()].sort((a, b) => b[1] - a[1])

  return entries.map(([label, value], i) => ({
    label,
    value,
    color: assignColor(i),
  }))
}

export function buildOptionDetailSegments(
  options: LivePositionRow[],
): DonutSegment[] {
  const bySymbol = new Map<string, number>()

  for (const pos of options) {
    const sym = (pos.symbol ?? '').toUpperCase()
    if (!sym) continue
    const mv = ibPositionMarketValue(pos)
    bySymbol.set(sym, (bySymbol.get(sym) ?? 0) + mv)
  }

  const entries = [...bySymbol.entries()].sort((a, b) => b[1] - a[1])

  return entries.map(([label, value], i) => ({
    label,
    value,
    color: assignColor(i),
  }))
}
