import { describe, it, expect } from 'vitest'
import { computeInstanceStockCoverage, buildStockCoverageItems, coverageStatus } from './stockCoverage'
import type { StrategyStructure, OpenOptionPosition, InstanceAllGroup, StockCoverageItem } from '@/types/positions'

describe('computeInstanceStockCoverage', () => {
  it('returns empty when no underlying leg', () => {
    const structure: StrategyStructure = {
      structure_type_id: 1,
      name: 'Iron Condor',
      code: 'iron_condor',
      legs: [{ role: 'option', sec_type: 'OPT', qty_multiplier: 1 }],
    }
    expect(computeInstanceStockCoverage([], structure)).toHaveLength(0)
  })

  it('computes required shares from options + underlying leg', () => {
    const structure: StrategyStructure = {
      structure_type_id: 2,
      name: 'Covered Call',
      code: 'covered_call',
      legs: [
        { role: 'underlying', sec_type: 'STK', qty_multiplier: 1 },
        { role: 'option', sec_type: 'OPT', right: 'C', qty_multiplier: -1 },
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
    ] as any[]

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
