import type { DailyBenchmark } from '@/types/market'
import {
  aggregateDailyChange,
  computeDailyChange,
  resolveDailyBasePrice,
} from '@/utils/dailyChange'

/** @deprecated Use resolveDailyBasePrice from @/utils/dailyChange */
export function resolveMarketStreamDailyBasePrice(
  bench: DailyBenchmark | undefined,
  dailyPrevCloseFromPosition?: number | null,
): number | null {
  return resolveDailyBasePrice(dailyPrevCloseFromPosition, bench)
}

/** @deprecated Use computeDailyChange from @/utils/dailyChange */
export function computeMarketStreamDailyChange(
  bench: DailyBenchmark | undefined,
  currPrice: number | null,
  qty: number,
  dailyPrevClose?: number | null,
): { changePct: number | null; pnlVsBench: number | null } {
  const basePrice = resolveDailyBasePrice(dailyPrevClose, bench)
  const { dailyPct, dailyDollar } = computeDailyChange(currPrice, basePrice, qty)
  return { changePct: dailyPct, pnlVsBench: dailyDollar }
}

/** Total Daily $ and weighted Daily % for Market Streams (denominator = Σ base × |qty|). */
export function aggregateMarketStreamsDailyTotals(
  rows: {
    symbol: string
    qty: number | null
    positionDailyPrevClose: number | null
    pnlVsBench: number | null
  }[],
  benchmarks: Record<string, DailyBenchmark>,
): { totalDailyDollar: number; totalDailyPct: number | null } {
  return aggregateDailyChange(
    rows.map((r) => {
      const sym = (r.symbol || '').trim().toUpperCase()
      return {
        dailyDollar: r.pnlVsBench,
        basePrice: resolveDailyBasePrice(r.positionDailyPrevClose, benchmarks[sym]),
        qty: r.qty,
      }
    }),
  )
}

export function getDailyRefTooltip(
  bench: DailyBenchmark | undefined,
  last: number | null,
): string | undefined {
  if (last == null) return undefined
  const base = resolveDailyBasePrice(undefined, bench)
  if (base == null) return undefined
  return `Daily ref: ${base.toFixed(2)} → Last: ${last.toFixed(2)}`
}
