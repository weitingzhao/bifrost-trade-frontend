import type {
  IvRadarBucket,
  IvRadarSource,
  IvRadarUniverseFilter,
  IvRadarUniverseItem,
} from '@/types/ivRadar'

/** Default market-weather benchmarks (locked Owner decision). */
export const DEFAULT_IV_RADAR_BENCHMARKS = ['SPY', 'QQQ', 'IWM'] as const

export const IV_RADAR_BUCKET_HINTS: Record<Exclude<IvRadarBucket, 'no_data'>, string> = {
  high: 'IV Rank > 60 — elevated vs 1y range',
  neutral: 'IV Rank 30–60 — mid-range regime',
  low: 'IV Rank < 30 — cheap vs 1y range',
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
 * Primary regime buckets from IV Rank (not Percentile).
 * High >60 · Neutral 30–60 · Low <30 · missing → no_data.
 */
export function bucketByIvRank(rank: number | null | undefined): IvRadarBucket {
  if (rank == null || !Number.isFinite(rank)) return 'no_data'
  if (rank > 60) return 'high'
  if (rank < 30) return 'low'
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
