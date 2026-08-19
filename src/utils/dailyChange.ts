import type { DailyBenchmark } from '@/types/market'

function finitePositive(value: unknown): number | null {
  if (value == null) return null
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** Position row, raw daily_prev_close, or omitted (benchmark-only). */
export type DailyPrevCloseSource =
  | number
  | null
  | undefined
  | { daily_prev_close?: number | null }

function extractDailyPrevClose(source: DailyPrevCloseSource): number | null {
  if (source == null || typeof source === 'number') return finitePositive(source)
  return finitePositive(source.daily_prev_close)
}

/**
 * Prior close for Daily % / Daily $.
 * 1. position.daily_prev_close (yesterday close after core 0.8.4 fallback)
 * 2. If bench.is_today and prev_close > 0 → prev_close
 * 3. Else bench.close (latest daily bar = yesterday when not today)
 */
export function resolveDailyBasePrice(
  source: DailyPrevCloseSource,
  benchmark?: DailyBenchmark,
): number | null {
  const fromPosition = extractDailyPrevClose(source)
  if (fromPosition != null) return fromPosition
  if (!benchmark) return null
  const prev = finitePositive(benchmark.prev_close)
  if (benchmark.is_today && prev != null) return prev
  return finitePositive(benchmark.close)
}

export interface DailyChangeResult {
  dailyDollar: number | null
  dailyPct: number | null
}

/**
 * Daily % is price return vs prior close: (last − base) / base × 100.
 * Daily $ is (last − base) × qty when qty is finite; otherwise per-share delta.
 */
export function computeDailyChange(
  last: number | null | undefined,
  basePrice: number | null,
  qty?: number | null,
): DailyChangeResult {
  if (
    last == null ||
    !Number.isFinite(last) ||
    basePrice == null ||
    !Number.isFinite(basePrice) ||
    basePrice === 0
  ) {
    return { dailyDollar: null, dailyPct: null }
  }
  const delta = last - basePrice
  const dailyPct = (delta / basePrice) * 100
  const dailyDollar = qty != null && Number.isFinite(qty) ? delta * qty : delta
  return { dailyDollar, dailyPct }
}

/** Weighted Daily %: Σ Daily $ / Σ (base × |qty|). */
export function aggregateDailyChange(
  rows: { dailyDollar: number | null; basePrice: number | null; qty: number | null }[],
): { totalDailyDollar: number; totalDailyPct: number | null } {
  let totalDailyDollar = 0
  let totalDailyDenom = 0
  for (const r of rows) {
    if (r.dailyDollar != null && Number.isFinite(r.dailyDollar)) totalDailyDollar += r.dailyDollar
    const qty = r.qty != null && Number.isFinite(r.qty) ? r.qty : 0
    if (r.basePrice != null && Number.isFinite(r.basePrice) && r.basePrice > 0 && qty !== 0) {
      totalDailyDenom += r.basePrice * Math.abs(qty)
    }
  }
  const totalDailyPct =
    totalDailyDenom !== 0 && Number.isFinite(totalDailyDollar)
      ? (totalDailyDollar / totalDailyDenom) * 100
      : null
  return { totalDailyDollar, totalDailyPct }
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

/** Realized PnL — site-wide tokens: profit green / loss red (see /settings/ui-design-system). */
export function pnlColorClass(value: number | null | undefined): string {
  if (value == null || value === 0) return 'text-muted-foreground'
  return value > 0 ? 'text-profit' : 'text-loss'
}

/** Unrealized PnL — site-wide yellow (--color-unrealized), not green/red. */
export function unrealizedPnlColorClass(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return 'text-muted-foreground'
  return 'text-unrealized font-semibold'
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
