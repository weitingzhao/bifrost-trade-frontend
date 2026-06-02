import type { DailyBenchmark } from '@/types/market'
import type { IbPositionRow } from '@/types/monitor'

/**
 * Resolve the base price for daily % / $ calculation.
 * Priority: position.daily_prev_close > benchmark prev_close > benchmark close
 */
export function resolveDailyBasePrice(
  position: IbPositionRow | undefined,
  benchmark: DailyBenchmark | undefined,
): number | null {
  if (position?.daily_prev_close != null) return position.daily_prev_close
  if (benchmark?.prev_close != null) return benchmark.prev_close
  if (benchmark?.close != null && !benchmark.is_today) return benchmark.close
  return null
}

export interface DailyChangeResult {
  dailyDollar: number | null
  dailyPct: number | null
}

export function computeDailyChange(
  last: number | null | undefined,
  basePrice: number | null,
): DailyChangeResult {
  if (last == null || basePrice == null || basePrice === 0) {
    return { dailyDollar: null, dailyPct: null }
  }
  const dailyDollar = last - basePrice
  const dailyPct = (dailyDollar / basePrice) * 100
  return { dailyDollar, dailyPct }
}

export function computeSinceChange(
  last: number | null | undefined,
  avgCost: number | null | undefined,
  qty: number | null | undefined,
): { sinceDollar: number | null; sincePct: number | null } {
  if (last == null || avgCost == null || avgCost === 0) {
    return { sinceDollar: null, sincePct: null }
  }
  const perShare = last - avgCost
  const sinceDollar = qty != null ? perShare * qty : perShare
  const sincePct = (perShare / avgCost) * 100
  return { sinceDollar, sincePct }
}

export function pnlColorClass(value: number | null | undefined): string {
  if (value == null || value === 0) return 'text-muted-foreground'
  return value > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
}

/** Unrealized PnL — site-wide yellow (warning), not green/red. */
export function unrealizedPnlColorClass(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return 'text-muted-foreground'
  return 'text-warning font-semibold'
}

export function fmtPct(value: number | null | undefined): string {
  if (value == null) return '—'
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

export function fmtDollar(value: number | null | undefined): string {
  if (value == null) return '—'
  const abs = Math.abs(value)
  const s = abs >= 1000 ? `$${(abs / 1000).toFixed(1)}k` : `$${abs.toFixed(0)}`
  return value < 0 ? `-${s}` : `+${s}`
}

export function fmtPrice(value: number | null | undefined): string {
  if (value == null) return '—'
  return value.toFixed(2)
}
