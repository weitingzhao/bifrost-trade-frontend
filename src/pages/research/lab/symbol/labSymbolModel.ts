/**
 * The Symbol Method face's arithmetic (design `Research Symbol Method.dc.html`,
 * route rev 2026-09-20.4): the raw SVI fit behind the surface Trade quotes,
 * refit by hand; the no-arbitrage checks; and the what-if grid that shifts the
 * surface without reshaping it.
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

/* ── the what-if grid ────────────────────────────────────────────────────── */

export type WhatIfStructure = 'strangle' | 'spread' | 'calendar'

export const WHAT_IF_STRUCTURES: Record<WhatIfStructure, string> = {
  strangle: '30d strangle',
  spread: 'put spread',
  calendar: 'calendar',
}

/**
 * The design's own cell: the change in structure value in vol-point terms for
 * a spot move and a parallel IV shift, at the archetype's vega and gamma
 * signs, with the strangle also paying theta as days burn. A sketch of shape,
 * not a priced book — the note under the grid says so, and the Payoff face is
 * where a real structure gets priced.
 */
export function whatIfCell(struct: WhatIfStructure, dSpotPct: number, dVolPts: number, dteHeld: number): number {
  const vegaSign = struct === 'spread' ? 0.35 : struct === 'calendar' ? 0.9 : -1
  const gammaSign = struct === 'strangle' ? -1 : struct === 'spread' ? 0.4 : -0.3
  const decay = Math.max(0.15, dteHeld / 30)
  return (
    (vegaSign * dVolPts * 1.9 +
      gammaSign * Math.pow(dSpotPct, 2) * 0.055 +
      (struct === 'strangle' ? (30 - dteHeld) * 0.18 : 0)) *
    decay
  )
}

export const GRID_VOL_COLS = [-6, -3, 0, 3, 6] as const
export const GRID_SPOT_ROWS = [-8, -5, -2, 0, 2, 5, 8] as const

export interface WhatIfGrid {
  cells: { dSpot: number; dVol: number; value: number }[][]
  worst: number
  best: number
  span: number
}

export function whatIfGrid(struct: WhatIfStructure, dSpot: number, dVol: number, dte: number): WhatIfGrid {
  const cells = GRID_SPOT_ROWS.map((rowS) =>
    GRID_VOL_COLS.map((colV) => ({
      dSpot: rowS,
      dVol: colV,
      value: whatIfCell(struct, rowS + dSpot, colV + dVol, dte),
    })),
  )
  const all = cells.flat().map((c) => c.value)
  return {
    cells,
    worst: Math.min(...all),
    best: Math.max(...all),
    span: Math.max(...all.map(Math.abs)) || 1,
  }
}
