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

  it('returns converged=false for zero T', () => {
    const { converged } = impliedVolatility(100, 100, 0, 0.05, 2, 'C')
    expect(converged).toBe(false)
  })
})
