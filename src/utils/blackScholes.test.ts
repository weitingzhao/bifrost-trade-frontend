import { describe, it, expect } from 'vitest'
import { bsComputeDetail, impliedVolatility } from './blackScholes'

describe('bsComputeDetail', () => {
  it('ATM call delta ≈ 0.5', () => {
    const { delta } = bsComputeDetail({ S: 100, K: 100, T: 0.25, r: 0.05, sigma: 0.2, right: 'C' })
    expect(delta).toBeGreaterThan(0.48)
    expect(delta).toBeLessThan(0.62)
  })

  it('ATM put delta ≈ -0.5', () => {
    const { delta } = bsComputeDetail({ S: 100, K: 100, T: 0.25, r: 0.05, sigma: 0.2, right: 'P' })
    expect(delta).toBeLessThan(-0.38)
    expect(delta).toBeGreaterThan(-0.52)
  })

  it('gamma > 0 for call and put', () => {
    const c = bsComputeDetail({ S: 100, K: 100, T: 0.25, r: 0.05, sigma: 0.2, right: 'C' })
    const p = bsComputeDetail({ S: 100, K: 100, T: 0.25, r: 0.05, sigma: 0.2, right: 'P' })
    expect(c.gamma).toBeGreaterThan(0)
    expect(p.gamma).toBeGreaterThan(0)
    expect(c.gamma).toBeCloseTo(p.gamma, 5)
  })

  it('vega > 0', () => {
    const { vega } = bsComputeDetail({ S: 100, K: 100, T: 0.25, r: 0.05, sigma: 0.2, right: 'C' })
    expect(vega).toBeGreaterThan(0)
  })

  it('theta < 0', () => {
    const c = bsComputeDetail({ S: 100, K: 100, T: 0.25, r: 0.05, sigma: 0.2, right: 'C' })
    const p = bsComputeDetail({ S: 100, K: 100, T: 0.25, r: 0.05, sigma: 0.2, right: 'P' })
    expect(c.theta).toBeLessThan(0)
    expect(p.theta).toBeLessThan(0)
  })

  it('deep ITM call delta ≈ 1', () => {
    const { delta } = bsComputeDetail({ S: 150, K: 100, T: 0.5, r: 0.05, sigma: 0.2, right: 'C' })
    expect(delta).toBeGreaterThan(0.95)
  })

  it('deep OTM call delta ≈ 0', () => {
    const { delta } = bsComputeDetail({ S: 50, K: 100, T: 0.5, r: 0.05, sigma: 0.2, right: 'C' })
    expect(delta).toBeLessThan(0.05)
  })

  it('put-call parity holds', () => {
    const S = 100, K = 100, T = 0.5, r = 0.05, sigma = 0.3
    const call = bsComputeDetail({ S, K, T, r, sigma, right: 'C' })
    const put = bsComputeDetail({ S, K, T, r, sigma, right: 'P' })
    const parity = call.price - put.price - (S - K * Math.exp(-r * T))
    expect(Math.abs(parity)).toBeLessThan(0.001)
  })

  it('returns degenerate result for zero T', () => {
    const r = bsComputeDetail({ S: 100, K: 100, T: 0, r: 0.05, sigma: 0.2, right: 'C' })
    expect(r.iv_converged).toBe(false)
  })
})

describe('bsComputeDetail — additional edge cases', () => {
  it('returns all-zero result when sigma=0', () => {
    const r = bsComputeDetail({ S: 100, K: 100, T: 1, r: 0.05, sigma: 0, right: 'C' })
    expect(r.price).toBe(0)
    expect(r.delta).toBe(0)
    expect(r.iv_converged).toBe(false)
  })

  it('returns all-zero result when S=0', () => {
    const r = bsComputeDetail({ S: 0, K: 100, T: 1, r: 0.05, sigma: 0.2, right: 'C' })
    expect(r.price).toBe(0)
  })

  it('returns all-zero result when K=0', () => {
    const r = bsComputeDetail({ S: 100, K: 0, T: 1, r: 0.05, sigma: 0.2, right: 'C' })
    expect(r.price).toBe(0)
  })

  it('higher sigma → higher call price', () => {
    const base = { S: 100, K: 100, T: 1, r: 0.05, right: 'C' as const }
    const lo = bsComputeDetail({ ...base, sigma: 0.1 })
    const hi = bsComputeDetail({ ...base, sigma: 0.5 })
    expect(hi.price).toBeGreaterThan(lo.price)
  })

  it('longer T → higher call price', () => {
    const base = { S: 100, K: 100, r: 0.05, sigma: 0.2, right: 'C' as const }
    const short = bsComputeDetail({ ...base, T: 0.1 })
    const long  = bsComputeDetail({ ...base, T: 2.0 })
    expect(long.price).toBeGreaterThan(short.price)
  })

  it('put-call delta parity: put.delta = call.delta - 1', () => {
    const base = { S: 100, K: 100, T: 1, r: 0.05, sigma: 0.2 }
    const call = bsComputeDetail({ ...base, right: 'C' })
    const put  = bsComputeDetail({ ...base, right: 'P' })
    expect(put.delta).toBeCloseTo(call.delta - 1, 6)
  })

  it('call delta bounded in (0, 1) across moneyness range', () => {
    const configs = [
      { S: 50,  K: 100 },  // deep OTM
      { S: 100, K: 100 },  // ATM
      { S: 150, K: 100 },  // deep ITM
    ]
    for (const { S, K } of configs) {
      const { delta } = bsComputeDetail({ S, K, T: 0.5, r: 0.05, sigma: 0.2, right: 'C' })
      expect(delta).toBeGreaterThan(0)
      expect(delta).toBeLessThan(1)
    }
  })

  it('put delta bounded in (-1, 0) across moneyness range', () => {
    const configs = [
      { S: 50,  K: 100 },
      { S: 100, K: 100 },
      { S: 150, K: 100 },
    ]
    for (const { S, K } of configs) {
      const { delta } = bsComputeDetail({ S, K, T: 0.5, r: 0.05, sigma: 0.2, right: 'P' })
      expect(delta).toBeGreaterThan(-1)
      expect(delta).toBeLessThan(0)
    }
  })
})

describe('impliedVolatility', () => {
  it('IV round-trip: price → IV → price error < $0.001', () => {
    const S = 100, K = 105, T = 0.25, r = 0.05, sigma = 0.25
    const { price } = bsComputeDetail({ S, K, T, r, sigma, right: 'C' })
    const { sigma: solved, converged } = impliedVolatility(S, K, T, r, price, 'C')
    expect(converged).toBe(true)
    const { price: recomputed } = bsComputeDetail({ S, K, T, r, sigma: solved, right: 'C' })
    expect(Math.abs(recomputed - price)).toBeLessThan(0.001)
  })

  it('put IV round-trip', () => {
    const S = 100, K = 95, T = 0.5, r = 0.05, sigma = 0.3
    const { price } = bsComputeDetail({ S, K, T, r, sigma, right: 'P' })
    const { sigma: solved, converged } = impliedVolatility(S, K, T, r, price, 'P')
    expect(converged).toBe(true)
    expect(Math.abs(solved - sigma)).toBeLessThan(0.001)
  })

  it('high-vol round-trip (sigma=0.8)', () => {
    const inp = { S: 200, K: 180, T: 0.5, r: 0.04, sigma: 0.8 }
    const { price } = bsComputeDetail({ ...inp, right: 'C' })
    const { sigma: solved, converged } = impliedVolatility(inp.S, inp.K, inp.T, inp.r, price, 'C')
    expect(converged).toBe(true)
    expect(solved).toBeCloseTo(0.8, 3)
  })

  it('low-vol round-trip (sigma=0.05)', () => {
    const inp = { S: 100, K: 100, T: 1, r: 0.05, sigma: 0.05 }
    const { price } = bsComputeDetail({ ...inp, right: 'C' })
    const { sigma: solved, converged } = impliedVolatility(inp.S, inp.K, inp.T, inp.r, price, 'C')
    expect(converged).toBe(true)
    expect(solved).toBeCloseTo(0.05, 4)
  })

  it('returns converged=false for zero T', () => {
    const { converged } = impliedVolatility(100, 100, 0, 0.05, 2, 'C')
    expect(converged).toBe(false)
  })

  it('returns converged=false for zero marketPrice', () => {
    const { converged } = impliedVolatility(100, 100, 1, 0.05, 0, 'C')
    expect(converged).toBe(false)
  })

  it('iterations > 0 when converged', () => {
    const { price } = bsComputeDetail({ S: 100, K: 100, T: 1, r: 0.05, sigma: 0.2, right: 'C' })
    const { iterations } = impliedVolatility(100, 100, 1, 0.05, price, 'C')
    expect(iterations).toBeGreaterThan(0)
  })
})
