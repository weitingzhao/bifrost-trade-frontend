import type { DailyBenchmark } from '@/types/market'

export function resolveMarketStreamDailyBasePrice(
  bench: DailyBenchmark | undefined,
  dailyPrevCloseFromPosition?: number | null,
): number | null {
  if (
    dailyPrevCloseFromPosition != null &&
    Number.isFinite(dailyPrevCloseFromPosition) &&
    dailyPrevCloseFromPosition > 0
  ) {
    return dailyPrevCloseFromPosition
  }
  if (bench && bench.close != null && Number.isFinite(bench.close) && bench.close > 0) {
    const prevClose =
      bench.prev_close != null && Number.isFinite(bench.prev_close) && bench.prev_close > 0
        ? bench.prev_close
        : null
    const base = bench.is_today && prevClose != null ? prevClose : bench.close
    return Number.isFinite(base) && base > 0 ? base : null
  }
  return null
}

export function computeMarketStreamDailyChange(
  bench: DailyBenchmark | undefined,
  currPrice: number | null,
  qty: number,
  dailyPrevClose?: number | null,
): { changePct: number | null; pnlVsBench: number | null } {
  if (currPrice == null || !Number.isFinite(currPrice)) {
    return { changePct: null, pnlVsBench: null }
  }
  const basePrice = resolveMarketStreamDailyBasePrice(bench, dailyPrevClose)
  if (basePrice == null) {
    return { changePct: null, pnlVsBench: null }
  }
  return {
    changePct: ((currPrice - basePrice) / basePrice) * 100,
    pnlVsBench: Number.isFinite(qty) ? (currPrice - basePrice) * qty : null,
  }
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
  let totalDailyDollar = 0
  let totalDailyDenom = 0
  for (const r of rows) {
    const sym = (r.symbol || '').trim().toUpperCase()
    const bench = benchmarks[sym]
    const qty = r.qty != null && Number.isFinite(r.qty) ? r.qty : 0
    if (r.pnlVsBench != null && Number.isFinite(r.pnlVsBench)) totalDailyDollar += r.pnlVsBench
    const base = resolveMarketStreamDailyBasePrice(bench, r.positionDailyPrevClose ?? undefined)
    if (base != null && qty !== 0) totalDailyDenom += base * Math.abs(qty)
  }
  const totalDailyPct =
    totalDailyDenom !== 0 && Number.isFinite(totalDailyDollar)
      ? (totalDailyDollar / totalDailyDenom) * 100
      : null
  return { totalDailyDollar, totalDailyPct }
}

export function getDailyRefTooltip(
  bench: DailyBenchmark | undefined,
  last: number | null,
): string | undefined {
  if (last == null) return undefined
  const base = resolveMarketStreamDailyBasePrice(bench, undefined)
  if (base == null) return undefined
  return `Daily ref: ${base.toFixed(2)} → Last: ${last.toFixed(2)}`
}
