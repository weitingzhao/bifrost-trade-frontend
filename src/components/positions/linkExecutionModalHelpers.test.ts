import { describe, expect, it } from 'vitest'
import {
  extractUnderlyingRootSymbol,
  filterOpportunitiesBySymbol,
  getUnderlyingSymbolFromExecution,
  primaryUnderlyingFromExecutions,
} from '@/components/positions/linkExecutionModalHelpers'
import type { Execution, StrategyOpportunity } from '@/types/positions'

function opp(
  partial: Partial<StrategyOpportunity> & Pick<StrategyOpportunity, 'strategy_opportunity_id' | 'name'>,
): StrategyOpportunity {
  return {
    strategy_structure_id: 1,
    default_gate_safety_strategy_id: null,
    scope_type: 'watchlist_stk',
    is_active: true,
    created_at: null,
    updated_at: null,
    structure_name: null,
    gate_safety_name: null,
    symbols: [],
    ...partial,
  }
}

describe('extractUnderlyingRootSymbol', () => {
  it('parses space-padded OCC roots', () => {
    expect(extractUnderlyingRootSymbol('FN    261016P00350000')).toBe('FN')
    expect(extractUnderlyingRootSymbol('GOOG  261120C00370000')).toBe('GOOG')
  })
})

describe('getUnderlyingSymbolFromExecution', () => {
  it('uses symbol OCC root before contract_key', () => {
    const ex = {
      symbol: 'FN    261016P00350000',
      contract_key: 'FN    261016P00350000|OPT|20261016|350.0|P',
    } as Execution
    expect(getUnderlyingSymbolFromExecution(ex)).toBe('FN')
  })

  it('falls back to contract_key OCC root', () => {
    const ex = {
      symbol: '',
      contract_key: 'RKLB  260918C00095000|OPT|20260918|95.0|C',
    } as Execution
    expect(getUnderlyingSymbolFromExecution(ex)).toBe('RKLB')
  })
})

describe('primaryUnderlyingFromExecutions', () => {
  it('prefers OPT root over STK noise', () => {
    const rows = [
      { symbol: 'HIMS  261218C00040000', sec_type: 'OPT' },
      { symbol: 'SPY', sec_type: 'STK' },
    ] as Execution[]
    expect(primaryUnderlyingFromExecutions(rows)).toBe('HIMS')
  })

  it('returns empty when no executions', () => {
    expect(primaryUnderlyingFromExecutions([])).toBe('')
    expect(primaryUnderlyingFromExecutions(null)).toBe('')
  })
})

describe('filterOpportunitiesBySymbol', () => {
  const opps = [
    opp({ strategy_opportunity_id: 1, name: 'NVDA Cash Secured Put', symbols: ['NVDA'] }),
    opp({ strategy_opportunity_id: 2, name: 'GOOG Covered Call 10% OTM', symbols: ['GOOG'] }),
    opp({ strategy_opportunity_id: 3, name: 'FN Cash Secured Put', symbols: ['FN'] }),
    opp({
      strategy_opportunity_id: 4,
      name: 'TSLA Bull Put Spread',
      scope_type: 'watchlist_stk',
      symbols: [],
    }),
  ]

  it('returns all when exec symbol missing', () => {
    expect(filterOpportunitiesBySymbol(opps, '')).toHaveLength(4)
  })

  it('keeps only matching watchlist symbols', () => {
    const out = filterOpportunitiesBySymbol(opps, 'FN')
    expect(out.map((o) => o.strategy_opportunity_id)).toEqual([3])
  })

  it('does not treat empty watchlist symbols as match-all', () => {
    const out = filterOpportunitiesBySymbol(opps, 'NVDA')
    expect(out.map((o) => o.strategy_opportunity_id)).toEqual([1])
  })

  it('matches multi-symbol books by explicit list', () => {
    const books = [
      opp({
        strategy_opportunity_id: 10,
        name: 'Cash Secured Put book',
        scope_type: 'explicit_symbols',
        symbols: ['CBRS', 'DDOG', 'FN', 'GOOG', 'INTC', 'MRVL', 'NBIS', 'NVDA', 'TSLA'],
      }),
    ]
    expect(filterOpportunitiesBySymbol(books, 'FN').map((o) => o.strategy_opportunity_id)).toEqual([
      10,
    ])
    expect(filterOpportunitiesBySymbol(books, 'AAPL')).toHaveLength(0)
  })
})
