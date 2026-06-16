import type { LivePositionRow } from '@/types/positions'
import { isLedgerFixedIncomeCategory, isLedgerCashLikeCategory, ibPositionMarketValue } from './stockCategories'

export interface DonutSegment {
  label: string
  value: number
  color: string
}

/** Shared donut segment colors (Positions charts + other dashboards). */
export const DONUT_CHART_PALETTE = [
  '#38bdf8',
  '#76b900',
  '#fbbf24',
  '#ef4444',
  '#a855f7',
  '#f97316',
  '#4ade80',
  '#ec4899',
  '#84cc16',
  '#14b8a6',
  '#06b6d4',
  '#6366f1',
] as const

export function assignColor(index: number): string {
  return DONUT_CHART_PALETTE[index % DONUT_CHART_PALETTE.length]
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
  if (coreMV > 0) segments.push({ label: 'Stock', value: coreMV, color: 'var(--color-chart-stock)' })
  if (fiMV > 0) segments.push({ label: 'Fixed Income', value: fiMV, color: 'var(--color-chart-fi)' })
  const cashTotal = Math.max(0, totalCash) + cashLikeMV
  if (cashTotal > 0) segments.push({ label: 'Cash + Cash-like', value: cashTotal, color: 'var(--color-chart-cash)' })
  if (optMV > 0) segments.push({ label: 'Options', value: optMV, color: 'var(--color-chart-option)' })

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
