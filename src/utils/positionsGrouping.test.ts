import { describe, it, expect } from 'vitest'
import {
  classifyStockBucket,
  flattenPositions,
  splitBySecType,
  filterStocksByBucket,
  buildOpenOptionPositions,
  groupByInstance,
} from './positionsGrouping'
import type { LivePositionRow, OpenOptionPosition } from '@/types/positions'

describe('classifyStockBucket', () => {
  it('returns core for regular categories', () => {
    expect(classifyStockBucket('Tech')).toBe('core')
    expect(classifyStockBucket('Uncategorized')).toBe('core')
    expect(classifyStockBucket(null)).toBe('core')
    expect(classifyStockBucket(undefined)).toBe('core')
  })

  it('returns fixed_income for fixed income categories', () => {
    expect(classifyStockBucket('Fixed Income')).toBe('fixed_income')
    expect(classifyStockBucket('fix income fund')).toBe('fixed_income')
  })

  it('returns cash_like for cash-like categories', () => {
    expect(classifyStockBucket('Cash-like')).toBe('cash_like')
    expect(classifyStockBucket('Money Market')).toBe('cash_like')
  })
})

describe('flattenPositions', () => {
  it('flattens accounts into LivePositionRow array', () => {
    const accounts = [
      { account_id: 'U001', positions: [{ symbol: 'AAPL', secType: 'STK' }] },
      { account_id: 'U002', positions: [{ symbol: 'NVDA', secType: 'STK' }] },
    ]
    const result = flattenPositions(accounts)
    expect(result).toHaveLength(2)
    expect(result[0].account_id).toBe('U001')
    expect(result[0].symbol).toBe('AAPL')
    expect(result[1].account_id).toBe('U002')
  })

  it('handles accounts with no positions', () => {
    const accounts = [{ account_id: 'U001' }]
    expect(flattenPositions(accounts)).toHaveLength(0)
  })
})

describe('splitBySecType', () => {
  it('splits into stocks and options', () => {
    const positions = [
      { account_id: 'U1', symbol: 'AAPL', secType: 'STK' },
      { account_id: 'U1', symbol: 'AAPL', secType: 'OPT' },
      { account_id: 'U1', symbol: 'NVDA', secType: 'STK' },
    ] as LivePositionRow[]
    const { stocks, options } = splitBySecType(positions)
    expect(stocks).toHaveLength(2)
    expect(options).toHaveLength(1)
  })
})

describe('filterStocksByBucket', () => {
  it('filters by core bucket', () => {
    const stocks = [
      { account_id: 'U1', category: 'Tech' },
      { account_id: 'U1', category: 'Fixed Income' },
      { account_id: 'U1', category: 'Money Market' },
    ] as LivePositionRow[]
    expect(filterStocksByBucket(stocks, 'core')).toHaveLength(1)
    expect(filterStocksByBucket(stocks, 'fixed_income')).toHaveLength(1)
    expect(filterStocksByBucket(stocks, 'cash_like')).toHaveLength(1)
  })
})

describe('buildOpenOptionPositions', () => {
  it('builds positions with attribution info', () => {
    const optionPositions = [
      {
        account_id: 'U1',
        contract_key: 'AAPL|OPT|20250620|150|C',
        symbol: 'AAPL',
        secType: 'OPT',
        strike: 150,
        right: 'C',
        position: 2,
        avgCost: 5.0,
        price: 6.0,
        unrealized_pnl: 200,
      },
    ] as LivePositionRow[]

    const attributions = [
      {
        contract_key: 'AAPL|OPT|20250620|150|C',
        account_id: 'U1',
        attribution_type: 'single' as const,
        strategy_instance_id: 42,
        strategy_instance_label: 'AAPL CC #1',
        strategy_opportunity_id: 10,
        strategy_opportunity_name: 'AAPL Covered Call',
        attribution_ratio: 1.0,
      },
    ]

    const result = buildOpenOptionPositions(optionPositions, attributions)
    expect(result).toHaveLength(1)
    expect(result[0].strategy_instance_id).toBe(42)
    expect(result[0].attribution_type).toBe('single')
    expect(result[0].qty).toBe(2)
  })
})

describe('groupByInstance', () => {
  it('groups positions by strategy_instance_id', () => {
    const positions = [
      { strategy_instance_id: 1, strategy_instance_label: 'A', unrealized_pnl: 100 },
      { strategy_instance_id: 1, strategy_instance_label: 'A', unrealized_pnl: 50 },
      { strategy_instance_id: null, strategy_instance_label: null, unrealized_pnl: -20 },
    ] as OpenOptionPosition[]

    const groups = groupByInstance(positions)
    expect(groups).toHaveLength(2)

    const assigned = groups.find((g) => g.strategy_instance_id === 1)
    expect(assigned?.options).toHaveLength(2)
    expect(assigned?.options_unrealized_pnl).toBe(150)

    const unassigned = groups.find((g) => g.strategy_instance_id === null)
    expect(unassigned?.options).toHaveLength(1)
  })

  it('sorts unassigned to end', () => {
    const positions = [
      { strategy_instance_id: null, unrealized_pnl: 0 },
      { strategy_instance_id: 5, strategy_instance_label: 'B', unrealized_pnl: 0 },
    ] as OpenOptionPosition[]

    const groups = groupByInstance(positions)
    expect(groups[0].strategy_instance_id).toBe(5)
    expect(groups[1].strategy_instance_id).toBeNull()
  })
})
