import { describe, expect, it } from 'vitest'
import type { VolSurfaceResidualRow } from '@/api/research/volSurface'
import type { ChainContract } from '@/utils/optionChain'
import {
  arbChecks,
  fitQuality,
  GRID_SPOT_ROWS,
  GRID_VOL_COLS,
  smileRows,
  sviIvPts,
  sviTotalVariance,
  whatIfCell,
  whatIfGrid,
} from './labSymbolModel'

const P = { a: 0.01, b: 0.4, rho: -0.3, m: 0.05, sigma: 0.1 }

function resid(strike: number, k: number, iv: number): VolSurfaceResidualRow {
  return {
    strike,
    log_moneyness: k,
    iv_market: iv,
    iv_fitted: iv,
    residual: 0,
    residual_z: 0,
  } as VolSurfaceResidualRow
}

function contract(strike: number, right: 'C' | 'P', oi: number | null): ChainContract {
  return {
    ticker: `T${strike}${right}`,
    strike,
    right,
    mark: 1,
    iv: null,
    delta: null,
    gamma: null,
    theta: null,
    vega: null,
    oi,
    volume: null,
  }
}

describe('sviTotalVariance', () => {
  it('collapses to a + bσ at k = m, and total variance grows into the wings', () => {
    expect(sviTotalVariance(P, P.m)).toBeCloseTo(P.a + P.b * P.sigma, 12)
    expect(sviTotalVariance(P, 0.3)).toBeGreaterThan(sviTotalVariance(P, P.m))
    expect(sviTotalVariance(P, -0.3)).toBeGreaterThan(sviTotalVariance(P, P.m))
  })

  it('negative ρ makes the put wing richer than the call wing — the equity skew', () => {
    expect(sviTotalVariance(P, P.m - 0.2)).toBeGreaterThan(sviTotalVariance(P, P.m + 0.2))
  })

  it('iv in points is √(w/T) · 100 — the store convention pinned on DEV', () => {
    const T = 30 / 365
    const w = sviTotalVariance(P, 0)
    expect(sviIvPts(P, 0, T)).toBeCloseTo(Math.sqrt(w / T) * 100, 10)
  })
})

describe('arbChecks', () => {
  it('passes a tame fit and fails a wing slope past 4', () => {
    expect(arbChecks(P).every((c) => c.ok)).toBe(true)
    const [butterfly] = arbChecks({ ...P, b: 2.5, rho: -0.9 })
    expect(butterfly.ok).toBe(false) // 2.5 × 1.9 = 4.75
  })

  it('fails when minimum total variance dips negative', () => {
    const [, minVar] = arbChecks({ ...P, a: -0.1 })
    expect(minVar.ok).toBe(false)
  })
})

describe('smileRows', () => {
  const residuals = [resid(100, -0.25, 0.35), resid(105, -0.1, 0.3), resid(110, 0, 0.28), resid(115, 0.1, 0.27)]
  const chain = [
    contract(105, 'C', 400),
    contract(105, 'P', 200), // both rights sum per strike
    contract(110, 'C', 1400),
    contract(115, 'P', null),
  ]

  it('keeps only the near-money window, sorted by k, with OI summed across rights', () => {
    const rows = smileRows(residuals, chain, P, 30 / 365)
    expect(rows.map((r) => r.strike)).toEqual([105, 110, 115])
    expect(rows[0].oi).toBe(600)
    expect(rows[1].oi).toBe(1400)
    expect(rows[2].oi).toBeNull()
  })

  it('weights are OI shares of the window; thin marks OI under 900', () => {
    const rows = smileRows(residuals, chain, P, 30 / 365)
    expect(rows[0].weightPct).toBeCloseTo((600 / 2000) * 100, 8)
    expect(rows[0].thin).toBe(true)
    expect(rows[1].thin).toBe(false)
    expect(rows[2].weightPct).toBeNull()
  })

  it('residual is market minus the fit under the params in hand, in vol points', () => {
    const rows = smileRows(residuals, chain, P, 30 / 365)
    expect(rows[1].resid).toBeCloseTo(28 - sviIvPts(P, 0, 30 / 365), 8)
  })
})

describe('fitQuality', () => {
  it('rmse and worst residual over the window; null on an empty window', () => {
    const rows = smileRows([resid(100, 0, 0.3)], [], P, 30 / 365)
    const q = fitQuality(rows)
    expect(q.rmse).toBeCloseTo(Math.abs(rows[0].resid), 8)
    expect(q.maxResid).toBeCloseTo(Math.abs(rows[0].resid), 8)
    expect(fitQuality([])).toEqual({ rmse: null, maxResid: null })
  })
})

describe('whatIfCell', () => {
  it('a 30d strangle at rest is flat: no move, no shift, no burn', () => {
    expect(whatIfCell('strangle', 0, 0, 30)).toBeCloseTo(0, 10)
  })

  it('short the strangle: vol up hurts, spot moves hurt, days burnt pay', () => {
    expect(whatIfCell('strangle', 0, 3, 30)).toBeLessThan(0)
    expect(whatIfCell('strangle', 5, 0, 30)).toBeLessThan(0)
    expect(whatIfCell('strangle', 0, 0, 20)).toBeGreaterThan(0)
  })

  it('the calendar is the long-vega archetype; the spread barely cares', () => {
    expect(whatIfCell('calendar', 0, 3, 30)).toBeGreaterThan(0)
    expect(Math.abs(whatIfCell('spread', 0, 3, 30))).toBeLessThan(whatIfCell('calendar', 0, 3, 30))
  })
})

describe('whatIfGrid', () => {
  it('draws the full design grid with worst and best over every cell', () => {
    const g = whatIfGrid('strangle', 0, 0, 30)
    expect(g.cells.length).toBe(GRID_SPOT_ROWS.length)
    expect(g.cells[0].length).toBe(GRID_VOL_COLS.length)
    const all = g.cells.flat().map((c) => c.value)
    expect(g.worst).toBe(Math.min(...all))
    expect(g.best).toBe(Math.max(...all))
    expect(g.worst).toBeLessThan(0)
  })

  it('the sliders shift every cell — the surface moves, it does not reshape', () => {
    const base = whatIfGrid('calendar', 0, 0, 30)
    const up = whatIfGrid('calendar', 0, 2, 30)
    expect(up.cells[3][2].value).toBeGreaterThan(base.cells[3][2].value)
  })
})
