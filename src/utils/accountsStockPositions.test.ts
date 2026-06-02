import { describe, expect, it } from 'vitest'
import type { IbPositionRow } from '@/types/monitor'
import type { QuoteItem, DailyBenchmark } from '@/types/market'
import {
  calcStockGroupTotals,
  computeStockPositionRowMetrics,
  groupStockPositionsByCategory,
  stockGroupPctFromTotals,
} from './accountsStockPositions'

function stk(overrides: Partial<IbPositionRow> = {}): IbPositionRow {
  return {
    symbol: 'NVDA',
    secType: 'STK',
    position: 10,
    avgCost: 100,
    price: 110,
    category: 'SEPA',
    ...overrides,
  } as IbPositionRow
}

function quote(overrides: Partial<QuoteItem> = {}): QuoteItem {
  return { last: null, bid: null, ask: null, ...overrides }
}

function bench(overrides: Partial<DailyBenchmark> = {}): DailyBenchmark {
  return {
    bar_time: null,
    close: null,
    prev_close: null,
    is_today: true,
    is_stale: false,
    ...overrides,
  }
}

describe('computeStockPositionRowMetrics', () => {
  it('computes daily and change PnL from quote and bench', () => {
    const pos = stk()
    const m = computeStockPositionRowMetrics(
      pos,
      quote({ last: 110, timestamp: 1_700_000_000 }),
      bench({ prev_close: 105 }),
    )
    expect(m.totalCost).toBe(1000)
    expect(m.totalMarket).toBe(1100)
    expect(m.dailyUsd).toBeCloseTo(50)
    expect(m.dailyPct).toBeCloseTo(((110 - 105) / 105) * 100)
    expect(m.changeUsd).toBeCloseTo(100)
    expect(m.changePct).toBeCloseTo(10)
    expect(m.updTs).toBe(1_700_000_000)
  })

  it('uses unrealized_pnl when present', () => {
    const pos = stk({ unrealized_pnl: 42 })
    const m = computeStockPositionRowMetrics(pos, quote({ last: 110 }), undefined)
    expect(m.changeUsd).toBe(42)
  })
})

describe('calcStockGroupTotals', () => {
  it('sums group metrics across rows', () => {
    const rows = [stk({ symbol: 'A' }), stk({ symbol: 'B', position: 5, avgCost: 200 })]
    const quotes: Record<string, QuoteItem> = {
      A: quote({ last: 110 }),
      B: quote({ last: 210 }),
    }
    const benches: Record<string, DailyBenchmark> = {
      A: bench({ prev_close: 105 }),
      B: bench({ prev_close: 200 }),
    }
    const t = calcStockGroupTotals(rows, quotes, benches)
    expect(t.totalCost).toBe(1000 + 1000)
    expect(t.totalMarket).toBe(1100 + 1050)
    expect(t.dailyUsd).toBeCloseTo(50 + 50)
    expect(t.changeUsd).toBeCloseTo(100 + 50)
  })
})

describe('groupStockPositionsByCategory', () => {
  it('sorts Uncategorized first then alphabetically', () => {
    const groups = groupStockPositionsByCategory([
      stk({ category: 'Option Pool', symbol: 'A' }),
      stk({ category: undefined, symbol: 'B' }),
      stk({ category: 'SEPA', symbol: 'C' }),
    ])
    expect(groups.map((g) => g.category)).toEqual(['Uncategorized', 'Option Pool', 'SEPA'])
  })
})

describe('stockGroupPctFromTotals', () => {
  it('returns null pcts when total cost is zero', () => {
    expect(stockGroupPctFromTotals({
      totalCost: 0,
      totalMarket: 0,
      dailyUsd: 0,
      changeUsd: 0,
      hasDailyDenom: false,
    })).toEqual({ dailyPct: null, changePct: null })
  })
})
