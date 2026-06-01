import type { LivePositionRow } from '@/types/positions'

export interface IndependentHoldingMetrics {
  lastPrice: number | null
  dailyPnl: number | null
  dailyPct: number | null
  totalPnl: number | null
  totalPct: number | null
  marketValue: number | null
}

export function computeIndependentHoldingMetrics(position: LivePositionRow): IndependentHoldingMetrics {
  const qty = Number(position.position)
  const lastPrice =
    position.price != null && Number.isFinite(Number(position.price)) ? Number(position.price) : null
  const dailyPrev =
    position.daily_prev_close != null && Number.isFinite(Number(position.daily_prev_close))
      ? Number(position.daily_prev_close)
      : null

  let dailyPnl: number | null = null
  let dailyPct: number | null = null
  if (lastPrice != null && dailyPrev != null && Number.isFinite(qty) && qty !== 0) {
    dailyPnl = (lastPrice - dailyPrev) * qty
    const dBase = Math.abs(dailyPrev * qty)
    dailyPct = dBase > 0 ? (dailyPnl / dBase) * 100 : null
  }

  const totalPnl =
    position.unrealized_pnl != null && Number.isFinite(Number(position.unrealized_pnl))
      ? Number(position.unrealized_pnl)
      : null
  const avgCost =
    position.avgCost != null && Number.isFinite(Number(position.avgCost)) ? Number(position.avgCost) : null
  const costBasis =
    avgCost != null && Number.isFinite(qty) && qty !== 0 ? Math.abs(qty) * avgCost : null
  const totalPct =
    costBasis != null && costBasis > 0 && totalPnl != null && Number.isFinite(totalPnl)
      ? (totalPnl / costBasis) * 100
      : null

  const marketValue =
    lastPrice != null && Number.isFinite(qty) ? qty * lastPrice : null

  return { lastPrice, dailyPnl, dailyPct, totalPnl, totalPct, marketValue }
}

export function isIndependentHolding(row: LivePositionRow): boolean {
  return row.optionable !== true
}

export interface IndependentStockSection {
  title: string
  key: string
  rows: LivePositionRow[]
}

export function buildIndependentStockSections(
  coreStocks: LivePositionRow[],
  fixedIncomeStocks: LivePositionRow[],
  cashLikeStocks: LivePositionRow[],
): IndependentStockSection[] {
  const isIndep = isIndependentHolding
  return [
    { title: 'Stocks', key: 'ind-stk', rows: coreStocks.filter(isIndep) },
    { title: 'Fixed income', key: 'ind-fi', rows: fixedIncomeStocks.filter(isIndep) },
    { title: 'Cash-like', key: 'ind-cash', rows: cashLikeStocks.filter(isIndep) },
  ]
}
