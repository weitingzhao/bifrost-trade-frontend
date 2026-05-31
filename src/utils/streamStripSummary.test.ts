import { describe, it, expect } from 'vitest'
import { buildStreamStripModel, buildStripSymbolList } from '@/utils/streamStripSummary'
import type { StatusResponse } from '@/types/monitor'
import type { DailyBenchmark, QuoteItem } from '@/types/market'

describe('buildStripSymbolList', () => {
  it('merges subscribed tickers and quote map keys', () => {
    const list = buildStripSymbolList(
      { live_ui: { subscribed_tickers: ['NVDA', 'AAPL'] } } as StatusResponse,
      { TSLA: { last: 100 } as QuoteItem },
    )
    expect(list).toEqual(['AAPL', 'NVDA', 'TSLA'])
  })

  it('returns empty when no inputs', () => {
    expect(buildStripSymbolList(null, {})).toEqual([])
  })
})

describe('buildStreamStripModel', () => {
  it('returns zero orders and offline streams when status missing', () => {
    const m = buildStreamStripModel(null, {}, {})
    expect(m.openOrderCount).toBe(0)
    expect(m.streamsOnline).toBe(false)
    expect(m.symbolRows).toEqual([])
    expect(m.totalDailyDollar).toBe(0)
  })

  it('counts open orders from portfolio', () => {
    const status = {
      portfolio: { open_orders: [{}, {}], accounts: [] },
      live_ui: { subscribed_tickers: [] },
    } as unknown as StatusResponse
    const m = buildStreamStripModel(status, {}, {})
    expect(m.openOrderCount).toBe(2)
  })

  it('aggregates daily PnL for a symbol with position and quote', () => {
    const status = {
      portfolio: {
        open_orders: [],
        accounts: [
          {
            positions: [
              { symbol: 'NVDA', secType: 'STK', position: 10, avgCost: 100 },
            ],
          },
        ],
      },
      live_ui: { subscribed_tickers: ['NVDA'] },
      market_data: { quotes_redis_reader_ok: true },
      socket: { ib_ingestor: { connected: true } },
    } as unknown as StatusResponse
    const quotes: Record<string, QuoteItem> = {
      NVDA: { last: 110, bid: null, ask: null, ts: Date.now() / 1000 },
    }
    const benchmarks: Record<string, DailyBenchmark> = {
      NVDA: { bar_time: 0, close: 100, prev_close: 100, is_today: true, is_stale: false },
    }
    const m = buildStreamStripModel(status, quotes, benchmarks)
    expect(m.symbolRows).toHaveLength(1)
    expect(m.symbolRows[0].pnlVsBench).toBe(100)
    expect(m.totalDailyDollar).toBe(100)
    expect(m.symbolRows[0].tone).toBe('positive')
  })
})
