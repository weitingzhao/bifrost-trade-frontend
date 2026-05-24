import { describe, it, expect } from 'vitest'
import { computeRiskProfile, formatRiskLabel } from './riskProfile'
import type { RiskPosition } from './riskProfile'

describe('computeRiskProfile', () => {
  it('returns unknown for empty positions', () => {
    const result = computeRiskProfile([])
    expect(result.risk_type).toBe('unknown')
    expect(result.max_gain).toBeNull()
    expect(result.max_loss).toBeNull()
  })

  it('computes defined risk for long call', () => {
    const positions: RiskPosition[] = [
      { right: 'C', strike: 100, qty: 1, premium: 5 },
    ]
    const result = computeRiskProfile(positions)
    expect(result.risk_type).toBe('defined')
    expect(result.max_loss).toBeLessThan(0)
  })

  it('computes unlimited risk for naked short call', () => {
    const positions: RiskPosition[] = [
      { right: 'C', strike: 100, qty: -1, premium: 5 },
    ]
    const result = computeRiskProfile(positions)
    expect(result.risk_type).toBe('unlimited')
  })

  it('computes defined risk for covered call', () => {
    const positions: RiskPosition[] = [
      { right: 'C', strike: 110, qty: -1, premium: 3 },
    ]
    const result = computeRiskProfile(positions, 100, 100)
    expect(result.risk_type).toBe('defined')
    expect(result.max_gain).toBeGreaterThan(0)
  })

  it('finds breakeven points for straddle', () => {
    const positions: RiskPosition[] = [
      { right: 'C', strike: 100, qty: 1, premium: 5 },
      { right: 'P', strike: 100, qty: 1, premium: 5 },
    ]
    const result = computeRiskProfile(positions)
    expect(result.breakeven_points.length).toBeGreaterThanOrEqual(1)
    const be = result.breakeven_points[0]
    expect(be).toBeGreaterThan(85)
    expect(be).toBeLessThan(115)
  })
})

describe('formatRiskLabel', () => {
  it('formats unlimited', () => {
    expect(formatRiskLabel({ risk_type: 'unlimited', max_gain: 100, max_loss: -Infinity, breakeven_points: [] }))
      .toBe('Risk: Unlimited')
  })

  it('formats defined', () => {
    expect(formatRiskLabel({ risk_type: 'defined', max_gain: 500, max_loss: -200, breakeven_points: [] }))
      .toBe('Risk: Defined')
  })

  it('formats unknown', () => {
    expect(formatRiskLabel({ risk_type: 'unknown', max_gain: null, max_loss: null, breakeven_points: [] }))
      .toBe('Risk: Unknown')
  })
})
