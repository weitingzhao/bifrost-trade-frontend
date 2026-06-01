import { describe, it, expect } from 'vitest'
import { computeRiskProfile, formatRiskLabel, formatRiskDisplayLabels } from './riskProfile'
import type { RiskPosition } from './riskProfile'

describe('computeRiskProfile', () => {
  it('returns defined zero profile for empty positions', () => {
    const result = computeRiskProfile([], 0, null)
    expect(result.risk_type).toBe('defined')
    expect(result.max_gain).toBe(0)
    expect(result.max_loss).toBe(0)
  })

  it('computes defined risk for long call', () => {
    const positions: RiskPosition[] = [
      { right: 'C', strike: 100, qty: 1, avg_cost: 5 },
    ]
    const result = computeRiskProfile(positions, 0, null)
    expect(result.risk_type).toBe('defined')
    expect(result.max_loss).toBeLessThan(0)
  })

  it('computes unlimited risk for naked short call', () => {
    const positions: RiskPosition[] = [
      { right: 'C', strike: 100, qty: -1, avg_cost: 5 },
    ]
    const result = computeRiskProfile(positions, 0, null)
    expect(result.risk_type).toBe('unlimited')
  })

  it('computes defined risk for covered call', () => {
    const positions: RiskPosition[] = [
      { right: 'C', strike: 110, qty: -1, avg_cost: 3 },
    ]
    const result = computeRiskProfile(positions, 100, 100)
    expect(result.risk_type).toBe('defined')
    expect(result.max_gain).toBeGreaterThan(0)
  })

  it('finds breakeven points for straddle', () => {
    const positions: RiskPosition[] = [
      { right: 'C', strike: 100, qty: 1, avg_cost: 5 },
      { right: 'P', strike: 100, qty: 1, avg_cost: 5 },
    ]
    const result = computeRiskProfile(positions, 0, null)
    expect(result.breakeven_prices.length).toBeGreaterThanOrEqual(1)
    const be = result.breakeven_prices[0]
    expect(be).toBeGreaterThan(85)
    expect(be).toBeLessThan(115)
  })
})

describe('formatRiskDisplayLabels', () => {
  it('shows Unlimited for null max gain/loss', () => {
    const labels = formatRiskDisplayLabels({
      risk_type: 'unlimited',
      max_gain: null,
      max_loss: null,
      naked_short_call_contracts: 0,
      hedged_max_loss: null,
    })
    expect(labels.gainLabel).toBe('Unlimited')
    expect(labels.lossLabel).toBe('Unlimited')
    expect(labels.riskBadge).toBe('Unlimited')
  })

  it('formats finite gain and loss', () => {
    const labels = formatRiskDisplayLabels({
      risk_type: 'defined',
      max_gain: 500,
      max_loss: -200,
      naked_short_call_contracts: 0,
      hedged_max_loss: null,
    })
    expect(labels.gainLabel).toBe('$500.00')
    expect(labels.lossLabel).toBe('-$200.00')
    expect(labels.riskBadge).toBe('Defined')
  })
})

describe('formatRiskLabel', () => {
  const base = {
    breakeven_prices: [] as number[],
    net_premium: 0,
    naked_short_call_contracts: 0,
    hedged_max_loss: null,
    max_gain_scenario: null,
    max_gain_sample_scenario: null,
    max_loss_scenario: null,
    hedged_max_loss_scenario: null,
    stock_shares_modeled: 0,
    stock_avg_cost_known: true,
    calc_context: null,
  }

  it('formats unlimited loss label', () => {
    expect(
      formatRiskLabel({
        ...base,
        risk_type: 'unlimited',
        max_gain: 100,
        max_loss: null,
      }).lossLabel,
    ).toBe('Unlimited')
  })

  it('formats defined approx labels', () => {
    const labels = formatRiskLabel({
      ...base,
      risk_type: 'defined',
      max_gain: 500,
      max_loss: -200,
    })
    expect(labels.gainLabel).toBe('$500')
    expect(labels.lossLabel).toBe('-$200')
    expect(labels.riskBadge).toBe('Defined')
  })
})
