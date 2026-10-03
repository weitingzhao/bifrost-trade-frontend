/**
 * TD-42: the frontend's one Black-Scholes copy agrees with bifrost_core.pricing (Python).
 * `blackScholes.golden.json` holds core's values on a synthetic grid (generated with
 * core 0.36.1, not copied from any environment). N(x) and erf to 1e-14 absolute; price
 * and Greeks to 1e-10 relative; the research IV solver to the same answer (or both none).
 */
import { describe, expect, it } from 'vitest'
import golden from './blackScholes.golden.json'
import { bsComputeDetail, erf, impliedVolResearch, normalCDF } from './blackScholes'

const close = (a: number, b: number, rel: number, abs = 1e-12) =>
  Math.abs(a - b) <= Math.max(abs, rel * Math.abs(b))

describe('blackScholes matches bifrost_core.pricing', () => {
  it('erf and N(x) agree with Python math.erf', () => {
    for (const p of golden.cdf) {
      expect(Math.abs(erf(p.x) - p.erf)).toBeLessThanOrEqual(1e-14)
      expect(Math.abs(normalCDF(p.x) - p.cdf)).toBeLessThanOrEqual(1e-14)
    }
  })

  it('price, delta, gamma, theta per day and vega per 1% agree on the grid', () => {
    const bad: string[] = []
    for (const g of golden.grid) {
      const d = bsComputeDetail({ S: g.S, K: g.K, T: g.T, r: g.r, sigma: g.sigma, right: g.right as 'C' | 'P' })
      for (const k of ['price', 'delta', 'gamma', 'theta', 'vega'] as const) {
        if (!close(d[k], g[k], 1e-10)) bad.push(`${k} K=${g.K} T=${g.T} sigma=${g.sigma} ${g.right}: ${d[k]} vs ${g[k]}`)
      }
    }
    expect(bad.slice(0, 5)).toEqual([])
  })

  it('the research IV solver gives core IV_RESEARCH answers', () => {
    for (const g of golden.iv_research) {
      const { iv } = impliedVolResearch(g.p, g.S, g.K, g.T, g.r, g.right)
      if (g.iv == null) expect(iv).toBeNull()
      else expect(iv != null && close(iv, g.iv, 1e-9)).toBe(true)
    }
  })
})
