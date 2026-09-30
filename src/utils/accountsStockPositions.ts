import { quoteTimestamp } from '@/utils/positions'
import { computeDailyChange, resolveDailyBasePrice } from '@/utils/dailyChange'
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

export function computeStockPositionRowMetrics(
  pos: IbPositionRow,
  quote: QuoteItem | undefined,
  bench: DailyBenchmark | undefined,
): StockPositionRowMetrics {
  const qty = pos.position ?? 0
  const avgCost = pos.avgCost ?? null
  const currPrice = quote?.last ?? pos.price ?? null
  const basePrice = resolveDailyBasePrice(pos, bench)
  const totalCost = avgCost != null ? qty * avgCost : null
  const totalMarket = currPrice != null ? qty * currPrice : null
  const { dailyPct, dailyDollar } = computeDailyChange(currPrice, basePrice, qty)
  const dailyUsd = dailyDollar
  const changePct =
    currPrice != null && avgCost != null && avgCost !== 0
      ? ((currPrice - avgCost) / avgCost) * 100
      : null
  const changeUsd =
    pos.unrealized_pnl ??
    (currPrice != null && avgCost != null ? (currPrice - avgCost) * qty : null)
  const updTs = quoteTimestamp(quote) ?? pos.price_updated_at ?? null
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
