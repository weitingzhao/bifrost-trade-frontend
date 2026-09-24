/**
 * The Symbol Method face's own arithmetic — the what-if grid that shifts the
 * surface without reshaping it. The raw-SVI half (fit, arbitrage checks,
 * smile rows) moved to `utils/sviSmile` when the Symbol page's Skew panel
 * became its second reader (§14.2); the re-exports keep this module the
 * face's single import.
 */
export {
  arbChecks,
  fitQuality,
  K_WINDOW,
  smileRows,
  sviFromRow,
  sviIvPts,
  sviTotalVariance,
  THIN_OI,
  type SmileRow,
  type SviParams,
} from '@/utils/sviSmile'

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
