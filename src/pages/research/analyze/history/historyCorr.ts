/**
 * Correlation over time — Risk's matrix cell, walked back one session at a time.
 *
 * Every point is Research's own `/analytics/risk/correlation` read `as_of` that
 * session (research 0.124.0), so the line and the matrix are one
 * implementation. Until then this file replicated the engine's definition over
 * the plugin's closes and the panel flagged the two disagreeing.
 */
import type { RiskCorrelationCell, RiskCorrelationResponse } from '@/api/research/riskStats'

export interface RollingPoint {
  date: string
  rho: number
}

const DAY_MS = 86_400_000

/**
 * The last ``n`` weekdays up to and including ``asOf`` (YYYY-MM-DD), oldest
 * first. The page asks the matrix for each; a holiday among them answers for
 * the session before, and ``seriesFromMatrices`` drops the repeat — the
 * server's ``as_of`` is the calendar, not this list.
 */
export function weekdaysBack(asOf: string, n: number): string[] {
  const [y, m, d] = asOf.split('-').map(Number)
  if (!y || !m || !d || n <= 0) return []
  const out: string[] = []
  for (let t = Date.UTC(y, m - 1, d); out.length < n; t -= DAY_MS) {
    const dow = new Date(t).getUTCDay()
    if (dow !== 0 && dow !== 6) out.push(new Date(t).toISOString().slice(0, 10))
  }
  return out.reverse()
}

/**
 * One pair's line from the matrix read as of successive dates: a point per
 * distinct session the answers name, oldest first, skipping a cell whose window
 * did not fill (``rho`` null) and an answer that is missing.
 */
export function seriesFromMatrices(
  pair: { a: string; b: string },
  answers: readonly (RiskCorrelationResponse | null | undefined)[],
): RollingPoint[] {
  const byDate = new Map<string, number>()
  for (const ans of answers) {
    const rho = ans?.matrix?.[pair.a]?.[pair.b]?.rho
    if (ans?.as_of && rho != null) byDate.set(ans.as_of, rho)
  }
  return [...byDate.entries()].sort(([x], [y]) => x.localeCompare(y)).map(([date, rho]) => ({ date, rho }))
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
