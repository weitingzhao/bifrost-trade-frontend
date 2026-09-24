/**
 * The Method face's arithmetic for History (design
 * `Research History Method.dc.html`, route rev 2026-09-20.4): the same IV30,
 * recomputed against denominators the reader chooses — estimator,
 * annualisation, window sampling, percentile convention, tenor — over the
 * store's own daily bars.
 *
 * The reading face quotes the committed method from the vrp store; nothing
 * here changes what Trade reports. The estimators are the prototype's own
 * formulas, run on real OHLC.
 */
import type { DailyBar } from '@/api/marketData/dailyBars'

export type Estimator = 'cc' | 'park' | 'gk'
export type Overlap = 'overlap' | 'none'
export type PctlMethod = 'linear' | 'nearest' | 'hazen'

export const TENORS = [10, 20, 30, 60, 90] as const
export const METHOD_WINDOWS: readonly { id: string; sessions: number }[] = [
  { id: '3m', sessions: 63 },
  { id: '6m', sessions: 126 },
  { id: '1y', sessions: 252 },
  { id: '2y', sessions: 504 },
]

interface Ret {
  ret: number
  o: number | null
  h: number | null
  l: number | null
  c: number
}

/** Bars → returns, dropping days the store cannot price. */
export function returnsFrom(bars: readonly DailyBar[]): Ret[] {
  const out: Ret[] = []
  let prev: number | null = null
  for (const b of bars) {
    if (b.close == null || !(b.close > 0)) continue
    if (prev != null)
      out.push({ ret: Math.log(b.close / prev), o: b.open, h: b.high, l: b.low, c: b.close })
    prev = b.close
  }
  return out
}

const K_PARK = 1 / (4 * Math.log(2))
const GK2 = 2 * Math.log(2) - 1

/**
 * Annualised vol of one window, in vol points. The range estimators read the
 * whole bar; a window missing OHLC answers null rather than degrading to
 * close-to-close under the wrong name.
 */
export function windowVol(win: readonly Ret[], est: Estimator, ann: number): number | null {
  if (win.length < 2) return null
  const s = Math.sqrt(ann) * 100
  if (est === 'cc') {
    const m = win.reduce((a, b) => a + b.ret, 0) / win.length
    return Math.sqrt(win.reduce((a, b) => a + (b.ret - m) * (b.ret - m), 0) / (win.length - 1)) * s
  }
  if (
    win.some(
      (b) =>
        b.h == null ||
        b.l == null ||
        !(b.h > 0) ||
        !(b.l > 0) ||
        (est === 'gk' && (b.o == null || !(b.o > 0)))
    )
  )
    return null
  if (est === 'park') {
    return (
      Math.sqrt(
        (K_PARK / win.length) * win.reduce((a, b) => a + Math.pow(Math.log(b.h! / b.l!), 2), 0)
      ) * s
    )
  }
  return (
    Math.sqrt(
      win.reduce(
        (a, b) =>
          a + 0.5 * Math.pow(Math.log(b.h! / b.l!), 2) - GK2 * Math.pow(Math.log(b.c / b.o!), 2),
        0
      ) / win.length
    ) * s
  )
}

/** Rolling samples of `tenor`-session vol, overlapping or not, sorted. */
export function volSamples(
  rets: readonly Ret[],
  tenor: number,
  est: Estimator,
  ann: number,
  overlap: Overlap
): number[] {
  const out: number[] = []
  const step = overlap === 'overlap' ? 1 : tenor
  for (let i = tenor; i <= rets.length; i += step) {
    const v = windowVol(rets.slice(i - tenor, i), est, ann)
    if (v != null && Number.isFinite(v)) out.push(v)
  }
  return out.sort((a, b) => a - b)
}

/**
 * The two definitions the registry carries as separate lenses: rank is the
 * position between the extremes, percentile the share of the sample below.
 * Unclamped on purpose — a value outside the sample reports as outside.
 */
export function ivRank(sorted: readonly number[], x: number): number | null {
  if (sorted.length < 2) return null
  const lo = sorted[0]
  const hi = sorted[sorted.length - 1]
  return hi === lo ? 50 : ((x - lo) / (hi - lo)) * 100
}

export function ivPercentile(sorted: readonly number[], x: number, qm: PctlMethod): number | null {
  const n = sorted.length
  if (n === 0) return null
  let below = 0
  while (below < n && sorted[below] < x) below++
  if (qm === 'nearest') return (below / n) * 100
  if (qm === 'hazen') return ((below - 0.5) / n) * 100
  if (below === 0) return 0
  if (below >= n) return 100
  const a = sorted[below - 1]
  const b = sorted[below]
  return ((below - 1 + (b === a ? 0 : (x - a) / (b - a))) / (n - 1)) * 100
}

export interface MethodRow {
  window: string
  sessions: number
  rank: number | null
  percentile: number | null
  min: number | null
  median: number | null
  max: number | null
  /** Samples drawn, and the honest count once overlap is discounted. */
  n: number
  effN: number
}

export function methodTable(
  rets: readonly Ret[],
  iv: number,
  tenor: number,
  est: Estimator,
  ann: number,
  overlap: Overlap,
  qm: PctlMethod
): MethodRow[] {
  return METHOD_WINDOWS.map(({ id, sessions }) => {
    const slice = rets.slice(-sessions)
    const s = volSamples(slice, tenor, est, ann, overlap)
    const mid = s.length > 0 ? s[Math.floor((s.length - 1) / 2)] : null
    return {
      window: id,
      sessions: slice.length,
      rank: s.length > 1 ? ivRank(s, iv) : null,
      percentile: s.length > 0 ? ivPercentile(s, iv, qm) : null,
      min: s[0] ?? null,
      median: mid,
      max: s[s.length - 1] ?? null,
      n: s.length,
      effN: overlap === 'overlap' ? Math.max(1, Math.floor(s.length / tenor)) : s.length,
    }
  })
}

/** The headline the table exists for: how far the four windows disagree. */
export function percentileSpread(rows: readonly MethodRow[]): number | null {
  const ps = rows.map((r) => r.percentile).filter((v): v is number => v != null)
  if (ps.length < 2) return null
  return Math.max(...ps) - Math.min(...ps)
}

export interface ConeRow {
  tenor: number
  p5: number | null
  p20: number | null
  p50: number | null
  p80: number | null
  p95: number | null
}

/** The cone under the chosen method — quantiles of realised vol per tenor. */
export function coneRows(
  rets: readonly Ret[],
  est: Estimator,
  ann: number,
  overlap: Overlap
): ConeRow[] {
  const q = (s: readonly number[], p: number) =>
    s.length === 0 ? null : s[Math.min(s.length - 1, Math.max(0, Math.round(p * (s.length - 1))))]
  return TENORS.map((tenor) => {
    const s = volSamples(rets, tenor, est, ann, overlap)
    return {
      tenor,
      p5: q(s, 0.05),
      p20: q(s, 0.2),
      p50: q(s, 0.5),
      p80: q(s, 0.8),
      p95: q(s, 0.95),
    }
  })
}
