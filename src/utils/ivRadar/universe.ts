import { bandFromScore } from '@/lib/analyzeDepth'
import type {
  IvRadarBucket,
  IvRadarSource,
  IvRadarUniverseFilter,
  IvRadarUniverseItem,
} from '@/types/ivRadar'

/** Default market-weather benchmarks (locked Owner decision). */
export const DEFAULT_IV_RADAR_BENCHMARKS = ['SPY', 'QQQ', 'IWM'] as const

export const IV_RADAR_BUCKET_HINTS: Record<Exclude<IvRadarBucket, 'no_data'>, string> = {
  high: 'IV Rank ≥ 80 — elevated vs 1y range, and the side that triggers',
  neutral: 'IV Rank 20–80 — no trigger on either side',
  low: 'IV Rank ≤ 20 — cheap vs 1y range, and the side that triggers',
}

function normSym(s: string): string {
  return (s || '').trim().toUpperCase()
}

function uniqSorted(syms: Iterable<string>): string[] {
  return [...new Set([...syms].map(normSym).filter(Boolean))].sort()
}

/**
 * Assemble industry universe for IV Radar.
 * All = Benchmarks ∪ optionable Watchlist STK ∪ Holdings underlyings (no full-market scan).
 */
export function assembleUniverse(opts: {
  filter: IvRadarUniverseFilter
  benchmarks?: readonly string[]
  watchlist: readonly string[]
  holdings: readonly string[]
}): IvRadarUniverseItem[] {
  const benchmarks = uniqSorted(opts.benchmarks ?? DEFAULT_IV_RADAR_BENCHMARKS)
  const watchlist = uniqSorted(opts.watchlist)
  const holdings = uniqSorted(opts.holdings)

  let selected: string[]
  switch (opts.filter) {
    case 'benchmarks':
      selected = benchmarks
      break
    case 'watchlist':
      selected = watchlist
      break
    case 'holdings':
      selected = holdings
      break
    case 'all':
    default:
      selected = uniqSorted([...benchmarks, ...watchlist, ...holdings])
      break
  }

  const benchSet = new Set(benchmarks)
  const watchSet = new Set(watchlist)
  const holdSet = new Set(holdings)

  return selected.map(symbol => {
    const sources: IvRadarSource[] = []
    if (benchSet.has(symbol)) sources.push('benchmark')
    if (watchSet.has(symbol)) sources.push('watchlist')
    if (holdSet.has(symbol)) sources.push('holdings')
    // Filter-only symbols (e.g. watchlist filter) still tag their filter source
    if (sources.length === 0) {
      if (opts.filter === 'watchlist') sources.push('watchlist')
      else if (opts.filter === 'holdings') sources.push('holdings')
      else if (opts.filter === 'benchmarks') sources.push('benchmark')
    }
    return { symbol, sources }
  })
}

/**
 * Primary regime buckets from IV Rank (not Percentile), on the registry's bands.
 *
 * These were >60 / <30 — thresholds the lens registry retired, and the exact
 * inconsistency this program was opened to remove. A rank of 65 was tagged red
 * "High" on the same screen where the registry-driven verdict strip called it
 * "leaning rich", and the row's hit-rate column then showed the >= 80 side's record.
 * High is now the hot band and Low the cold band, the only two that trigger.
 */
export function bucketByIvRank(rank: number | null | undefined): IvRadarBucket {
  const band = bandFromScore(rank ?? null)
  if (band === null) return 'no_data'
  if (band === 'hot') return 'high'
  if (band === 'cold') return 'low'
  return 'neutral'
}

export function formatIvRadarSource(sources: readonly IvRadarSource[]): string {
  const labels: Record<IvRadarSource, string> = {
    benchmark: 'Benchmark',
    watchlist: 'Watchlist',
    holdings: 'Holdings',
  }
  if (sources.length === 0) return '—'
  return sources.map(s => labels[s]).join(', ')
}

/** Sort helpers for extremes view. */
export function ivRankDistanceFrom50(rank: number | null | undefined): number {
  if (rank == null || !Number.isFinite(rank)) return -1
  return Math.abs(rank - 50)
}
