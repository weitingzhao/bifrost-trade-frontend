/**
 * The raw-SVI arithmetic behind the surface Trade quotes — promoted from the
 * Symbol lab when the Symbol page's Skew panel became its second reader
 * (§14.2): the store's parameterisation, the no-arbitrage checks, and the
 * near-money smile rows joined to chain OI.
 *
 * The parameterisation is the store's own, pinned on DEV before building:
 * `iv_fitted = √(w(k) / T)` with `w(k) = a + b(ρ(k−m) + √((k−m)² + σ²))` —
 * total variance, T in years. The sliders start at the committed fit and
 * reproduce it bit-for-bit; a drag recomputes honestly.
 */
import type { VolSurfaceFitRow, VolSurfaceResidualRow } from '@/api/research/volSurface'
import type { ChainContract } from '@/utils/optionChain'

export interface SviParams {
  a: number
  b: number
  rho: number
  m: number
  sigma: number
}

export function sviFromRow(row: VolSurfaceFitRow): SviParams | null {
  const { svi_a: a, svi_b: b, svi_rho: rho, svi_m: m, svi_sigma: sigma } = row
  if (a == null || b == null || rho == null || m == null || sigma == null) return null
  return { a, b, rho, m, sigma }
}

/** Total variance at log-moneyness k — the raw-SVI form the store fits. */
export function sviTotalVariance(p: SviParams, k: number): number {
  const d = k - p.m
  return p.a + p.b * (p.rho * d + Math.sqrt(d * d + p.sigma * p.sigma))
}

/** Fitted IV in vol points at k, for an expiry T years out. */
export function sviIvPts(p: SviParams, k: number, T: number): number {
  return Math.sqrt(Math.max(sviTotalVariance(p, k), 1e-12) / T) * 100
}

/**
 * The two no-arbitrage lamps the design draws, in Gatheral's shorthand:
 * `b(1+|ρ|) ≤ 4` caps the wings' slope (Roger Lee), and the minimum of total
 * variance must not go negative.
 */
export function arbChecks(p: SviParams): { label: string; value: string; ok: boolean }[] {
  const butterfly = p.b * (1 + Math.abs(p.rho))
  const minVar = p.a + p.b * p.sigma * Math.sqrt(Math.max(0, 1 - p.rho * p.rho))
  return [
    { label: 'b(1+|ρ|) ≤ 4', value: butterfly.toFixed(3), ok: butterfly <= 4 },
    { label: 'min variance ≥ 0', value: minVar.toFixed(6), ok: minVar >= 0 },
  ]
}

export interface SmileRow {
  strike: number
  k: number
  /** Market and fitted IV in vol points; fitted under the params in hand. */
  mkt: number
  fit: number
  resid: number
  /** Chain OI at the strike (both rights), and its share of the window's OI. */
  oi: number | null
  weightPct: number | null
  thin: boolean
}

/** The window the table reads — the design's ±0.20 of log-moneyness. */
export const K_WINDOW = 0.2
/** Below this OI the mid is mostly a modelled midpoint; the row carries a warn weight. */
export const THIN_OI = 900

/**
 * Residual rows joined to chain OI, refit under the params in hand. The
 * market leg is the store's; only the fitted leg moves with the sliders.
 */
export function smileRows(
  residuals: readonly VolSurfaceResidualRow[],
  chain: readonly ChainContract[],
  p: SviParams,
  T: number,
): SmileRow[] {
  const oiByStrike = new Map<number, number>()
  for (const c of chain) {
    if (c.oi != null) oiByStrike.set(c.strike, (oiByStrike.get(c.strike) ?? 0) + c.oi)
  }
  const near = residuals.filter(
    (r): r is VolSurfaceResidualRow & { strike: number; log_moneyness: number; iv_market: number } =>
      r.strike != null && r.log_moneyness != null && r.iv_market != null && Math.abs(r.log_moneyness) <= K_WINDOW,
  )
  const totalOi = near.reduce((a, r) => a + (oiByStrike.get(r.strike) ?? 0), 0)
  return near
    .map((r) => {
      const fit = sviIvPts(p, r.log_moneyness, T)
      const mkt = r.iv_market * 100
      const oi = oiByStrike.get(r.strike) ?? null
      return {
        strike: r.strike,
        k: r.log_moneyness,
        mkt,
        fit,
        resid: mkt - fit,
        oi,
        weightPct: oi != null && totalOi > 0 ? (oi / totalOi) * 100 : null,
        thin: oi != null && oi < THIN_OI,
      }
    })
    .sort((a, b) => a.k - b.k)
}

/** RMSE and worst residual over the shown window, in vol points. */
export function fitQuality(rows: readonly SmileRow[]): { rmse: number | null; maxResid: number | null } {
  if (rows.length === 0) return { rmse: null, maxResid: null }
  const rmse = Math.sqrt(rows.reduce((a, r) => a + r.resid * r.resid, 0) / rows.length)
  const maxResid = rows.reduce((a, r) => Math.max(a, Math.abs(r.resid)), 0)
  return { rmse, maxResid }
}

