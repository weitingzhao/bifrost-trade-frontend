import { describe, it, expect } from 'vitest'
import { computeInstanceStockCoverage, buildStockCoverageItems, coverageStatus } from './stockCoverage'
import type { StrategyStructure, OpenOptionPosition, InstanceAllGroup, StockCoverageItem, LivePositionRow } from '@/types/positions'

describe('computeInstanceStockCoverage', () => {
  it('returns empty when no underlying leg', () => {
    const structure: StrategyStructure = {
      strategy_structure_id: 1, name: 'Iron Condor',
      structure_type: null, structure_subtype: null, structure_subtype_label: null,
      strategy_template_id: null, template_code: null, template_display_name: null,
      dim_direction: null, dim_structure: null, dim_coverage: null, dim_risk: null,
      dim_volatility: null, dim_time: null, version: 1, is_active: true,
      created_at: null, updated_at: null, notes: null, constraints: [],
      legs: [{ role: 'option', direction: null, option_right: null, quantity: 1, strike: null, expiration: null }],
    }
    expect(computeInstanceStockCoverage([], structure)).toHaveLength(0)
  })

  it('computes required shares from options + underlying leg', () => {
    const structure: StrategyStructure = {
      strategy_structure_id: 2, name: 'Covered Call',
      structure_type: null, structure_subtype: null, structure_subtype_label: null,
      strategy_template_id: null, template_code: null, template_display_name: null,
      dim_direction: null, dim_structure: null, dim_coverage: null, dim_risk: null,
      dim_volatility: null, dim_time: null, version: 1, is_active: true,
      created_at: null, updated_at: null, notes: null, constraints: [],
      legs: [
        { role: 'underlying', direction: 'long', option_right: null, quantity: 1, strike: null, expiration: null },
        { role: 'option', direction: 'short', option_right: 'C', quantity: 1, strike: null, expiration: null },
      ],
    }
    const options: OpenOptionPosition[] = [
      { kind: 'live', contract_key: 'AAPL|OPT|20250620|150|C', symbol: 'AAPL', strike: 150, expiry: '20250620', right: 'C', qty: -2, avg_cost: 3, mark_price: 2.5, unrealized_pnl: 100, pool_label: 'On', account_id: 'U001' },
    ]
    const result = computeInstanceStockCoverage(options, structure)
    expect(result).toHaveLength(1)
    expect(result[0].symbol).toBe('AAPL')
    expect(result[0].required_shares).toBe(200)
    expect(result[0].direction).toBe('long')
  })
})

describe('buildStockCoverageItems', () => {
  it('aggregates demand from instances and held from stocks', () => {
    const groups: InstanceAllGroup[] = [
      {
        strategy_instance_id: 1,
        strategy_instance_label: 'CC #1',
        strategy_opportunity_name: 'AAPL CC',
        strategy_opportunity_id: 10,
        strategy_instance_opened_at_epoch: null,
        options: [],
        stock_coverage: [{ symbol: 'AAPL', account_id: 'U001', required_shares: 200, direction: 'long' }],
        options_unrealized_pnl: 0,
        structure_type: null,
        scope_type: null,
        risk_profile: null,
      },
    ]
    const stocks = [
      { account_id: 'U001', symbol: 'AAPL', position: 300, avgCost: 150, price: 155, secType: 'STK' },
    ] as LivePositionRow[]

    const items = buildStockCoverageItems(groups, stocks)
    expect(items).toHaveLength(1)
    expect(items[0].required_shares).toBe(200)
    expect(items[0].held_shares).toBe(300)
    expect(items[0].surplus_or_gap).toBe(100)
  })
})

describe('coverageStatus', () => {
  it('returns Covered when held >= required', () => {
    expect(coverageStatus({ held_shares: 200, required_shares: 200 } as StockCoverageItem)).toBe('Covered')
    expect(coverageStatus({ held_shares: 300, required_shares: 200 } as StockCoverageItem)).toBe('Covered')
  })

  it('returns Partial when held > 0 but < required', () => {
    expect(coverageStatus({ held_shares: 100, required_shares: 200 } as StockCoverageItem)).toBe('Partial')
  })

  it('returns Naked when held is 0', () => {
    expect(coverageStatus({ held_shares: 0, required_shares: 200 } as StockCoverageItem)).toBe('Naked')
  })
})
