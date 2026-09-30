import { describe, expect, it } from 'vitest'
import type { IbPositionRow } from '@/types/monitor'
import type { QuoteItem, DailyBenchmark } from '@/types/market'
import { computeStockPositionRowMetrics } from './accountsStockPositions'

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

  it('uses quote.ts for Upd when timestamp is absent', () => {
    const pos = stk({ price: 341.43, price_updated_at: 1_786_924_800 })
    const m = computeStockPositionRowMetrics(
      pos,
      quote({ last: 335.62, ts: 1_787_081_298 }),
      undefined,
    )
    expect(m.currPrice).toBe(335.62)
    expect(m.updTs).toBe(1_787_081_298)
  })

  it('uses unrealized_pnl when present', () => {
    const pos = stk({ unrealized_pnl: 42 })
    const m = computeStockPositionRowMetrics(pos, quote({ last: 110 }), undefined)
    expect(m.changeUsd).toBe(42)
  })
})
