import { resolveBasePrice } from '@/utils/positions'
import type { IbPositionRow } from '@/types/monitor'
import type { QuoteItem, DailyBenchmark } from '@/types/market'

export interface StockPositionRowMetrics {
  currPrice: number | null
  basePrice: number | null
  totalCost: number | null
  totalMarket: number | null
  dailyPct: number | null
  dailyUsd: number | null
  changePct: number | null
  changeUsd: number | null
  updTs: number | null
}

export interface StockGroupTotals {
  totalCost: number
  totalMarket: number
  dailyUsd: number
  changeUsd: number
  hasDailyDenom: boolean
}

export function computeStockPositionRowMetrics(
  pos: IbPositionRow,
  quote: QuoteItem | undefined,
  bench: DailyBenchmark | undefined,
): StockPositionRowMetrics {
  const qty = pos.position ?? 0
  const avgCost = pos.avgCost ?? null
  const currPrice = quote?.last ?? pos.price ?? null
  const basePrice = resolveBasePrice(pos, bench)
  const totalCost = avgCost != null ? qty * avgCost : null
  const totalMarket = currPrice != null ? qty * currPrice : null
  const dailyPct =
    currPrice != null && basePrice != null && basePrice !== 0
      ? ((currPrice - basePrice) / basePrice) * 100
      : null
  const dailyUsd =
    currPrice != null && basePrice != null ? (currPrice - basePrice) * qty : null
  const changePct =
    currPrice != null && avgCost != null && avgCost !== 0
      ? ((currPrice - avgCost) / avgCost) * 100
      : null
  const changeUsd =
    pos.unrealized_pnl ??
    (currPrice != null && avgCost != null ? (currPrice - avgCost) * qty : null)
  const updTs = quote?.timestamp ?? pos.price_updated_at ?? null
  return {
    currPrice,
    basePrice,
    totalCost,
    totalMarket,
    dailyPct,
    dailyUsd,
    changePct,
    changeUsd,
    updTs,
  }
}

export function calcStockGroupTotals(
  rows: IbPositionRow[],
  quotesBySymbol: Record<string, QuoteItem>,
  benchBySymbol: Record<string, DailyBenchmark>,
): StockGroupTotals {
  let totalCost = 0
  let totalMarket = 0
  let dailyUsd = 0
  let changeUsd = 0
  let hasDailyDenom = false
  for (const pos of rows) {
    const sym = pos.symbol?.toUpperCase() ?? ''
    const r = computeStockPositionRowMetrics(
      pos,
      quotesBySymbol[sym],
      benchBySymbol[sym],
    )
    if (r.totalCost != null) totalCost += r.totalCost
    if (r.totalMarket != null) totalMarket += r.totalMarket
    if (r.dailyUsd != null) {
      dailyUsd += r.dailyUsd
      hasDailyDenom = true
    }
    if (r.changeUsd != null) changeUsd += r.changeUsd
  }
  return { totalCost, totalMarket, dailyUsd, changeUsd, hasDailyDenom }
}

export function groupStockPositionsByCategory(
  positions: IbPositionRow[],
): { category: string; rows: IbPositionRow[] }[] {
  const byCategory: Record<string, IbPositionRow[]> = {}
  for (const pos of positions) {
    const cat = pos.category ?? 'Uncategorized'
    ;(byCategory[cat] ??= []).push(pos)
  }
  return Object.keys(byCategory)
    .sort((a, b) => {
      if (a === 'Uncategorized') return -1
      if (b === 'Uncategorized') return 1
      return a.localeCompare(b)
    })
    .map((category) => ({ category, rows: byCategory[category] }))
}

export function stockGroupPctFromTotals(totals: StockGroupTotals): {
  dailyPct: number | null
  changePct: number | null
} {
  if (totals.totalCost === 0) {
    return { dailyPct: null, changePct: null }
  }
  return {
    dailyPct: (totals.dailyUsd / totals.totalCost) * 100,
    changePct: (totals.changeUsd / totals.totalCost) * 100,
  }
}
