/**
 * Correlation over time — the rolling ρ behind Risk's matrix cell.
 *
 * The engine's definition, replicated exactly (analytics/risk/correlation:
 * date-intersection alignment, log returns, Pearson over the last `window`
 * returns) so the line's endpoint answers to the matrix. The page prints
 * both and flags a disagreement instead of hiding the second implementation
 * — the cross-check is the reason this panel may exist at all.
 */
import type { RiskCorrelationCell } from '@/api/research/riskStats'

export interface CloseBar {
  date: string
  close: number | null
}

/** Log returns over the two series' shared dates, engine-style. */
export function alignedLogReturns(
  a: readonly CloseBar[],
  b: readonly CloseBar[],
): { l: number[]; r: number[]; dates: string[] } {
  const bMap = new Map(b.filter((x) => x.close != null && x.close > 0).map((x) => [x.date, x.close as number]))
  const shared = a.filter((x) => x.close != null && x.close > 0 && bMap.has(x.date))
  const l: number[] = []
  const r: number[] = []
  const dates: string[] = []
  for (let i = 1; i < shared.length; i++) {
    l.push(Math.log((shared[i].close as number) / (shared[i - 1].close as number)))
    r.push(Math.log(bMap.get(shared[i].date)! / bMap.get(shared[i - 1].date)!))
    dates.push(shared[i].date)
  }
  return { l, r, dates }
}

function pearson(l: readonly number[], r: readonly number[]): number | null {
  const n = l.length
  if (n < 2) return null
  let sl = 0
  let sr = 0
  for (let i = 0; i < n; i++) {
    sl += l[i]
    sr += r[i]
  }
  const ml = sl / n
  const mr = sr / n
  let cov = 0
  let vl = 0
  let vr = 0
  for (let i = 0; i < n; i++) {
    const dl = l[i] - ml
    const dr = r[i] - mr
    cov += dl * dr
    vl += dl * dl
    vr += dr * dr
  }
  const denom = Math.sqrt(vl * vr)
  return denom > 0 ? cov / denom : null
}

export interface RollingPoint {
  date: string
  rho: number
}

/** ρ over a sliding window of returns; one point per session once filled. */
export function rollingPearson(
  l: readonly number[],
  r: readonly number[],
  dates: readonly string[],
  window: number,
): RollingPoint[] {
  const out: RollingPoint[] = []
  for (let end = window; end <= l.length; end++) {
    const rho = pearson(l.slice(end - window, end), r.slice(end - window, end))
    if (rho != null) out.push({ date: dates[end - 1], rho })
  }
  return out
}

export interface CorrPair {
  a: string
  b: string
  label: string
  /** The matrix's own reading — the committed one the endpoint answers. */
  matrixRho: number
}

/** The book's tightest pairs, straight off Risk's matrix, highest ρ first. */
export function topPairs(
  matrix: Readonly<Record<string, Record<string, RiskCorrelationCell>>> | null,
  symbols: readonly string[],
  k = 3,
): CorrPair[] {
  if (!matrix) return []
  const out: CorrPair[] = []
  for (let i = 0; i < symbols.length; i++) {
    for (let j = i + 1; j < symbols.length; j++) {
      const rho = matrix[symbols[i]]?.[symbols[j]]?.rho
      if (rho != null) {
        out.push({
          a: symbols[i],
          b: symbols[j],
          label: `${symbols[i]} / ${symbols[j]}`,
          matrixRho: rho,
        })
      }
    }
  }
  return out.sort((x, y) => y.matrixRho - x.matrixRho).slice(0, k)
}
