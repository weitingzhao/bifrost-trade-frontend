import { describe, it, expect } from 'vitest'
import type { QuoteItem, WatchlistItem } from '@/types/market'
import {
  buildMarketStreamsRowForSymbol,
  buildWatchlistSymbols,
  hasPosition,
  isObserveOnly,
  resolveSymbolSource,
  splitWatchingAndMarketStreams,
  trimStaleStkQuotes,
  type MarketStreamsRow,
  type SymbolSource,
} from './marketStreamsRows'
import type { IbAccountSnapshot } from '@/types/monitor'

function row(partial: Partial<MarketStreamsRow> & { symbol: string }): MarketStreamsRow {
  return {
    quote: null,
    qty: null,
    avgCost: null,
    changePct: null,
    pnlVsBench: null,
    hostPnlVsBench: null,
    secondaryPnlVsBench: null,
    pnlCost: null,
    streamCategory: null,
    isInWatchlist: false,
    category: 'Uncategorized',
    hostQty: null,
    hostAvgCost: null,
    hostPnlCost: null,
    secondaryQty: null,
    secondaryAvgCost: null,
    secondaryPnlCost: null,
    positionDailyPrevClose: null,
    symbolSource: 'residual',
    ...partial,
  }
}

describe('hasPosition / isObserveOnly', () => {
  it('treats non-zero qty as position', () => {
    expect(hasPosition(row({ symbol: 'NVDA', qty: 10 }))).toBe(true)
    expect(isObserveOnly(row({ symbol: 'NVDA', qty: 10 }))).toBe(false)
  })

  it('treats null/zero qty as observe-only', () => {
    expect(hasPosition(row({ symbol: 'AAPL', qty: null }))).toBe(false)
    expect(hasPosition(row({ symbol: 'AAPL', qty: 0 }))).toBe(false)
    expect(isObserveOnly(row({ symbol: 'AAPL', qty: null }))).toBe(true)
  })
})

describe('resolveSymbolSource', () => {
  it('prioritizes position over watchlist', () => {
    expect(
      resolveSymbolSource({
        qty: 5,
        isInWatchlist: true,
        symbol: 'NVDA',
        subscribedSymbols: new Set(['NVDA']),
      }),
    ).toBe('position')
  })

  it('uses watchlist before gateway / on-demand', () => {
    expect(
      resolveSymbolSource({
        qty: null,
        isInWatchlist: true,
        symbol: 'CAVA',
        gatewayDefaultSymbols: new Set(['CAVA']),
        subscribedSymbols: new Set(['CAVA']),
      }),
    ).toBe('watchlist')
  })

  it('classifies gateway-default and on-demand', () => {
    expect(
      resolveSymbolSource({
        qty: null,
        isInWatchlist: false,
        symbol: 'SPY',
        gatewayDefaultSymbols: new Set(['SPY']),
        subscribedSymbols: new Set(['SPY']),
      }),
    ).toBe('gateway-default')
    expect(
      resolveSymbolSource({
        qty: null,
        isInWatchlist: false,
        symbol: 'SATS',
        subscribedSymbols: new Set(['SATS']),
      }),
    ).toBe('on-demand')
    expect(
      resolveSymbolSource({
        qty: null,
        isInWatchlist: false,
        symbol: 'GHOST',
      }),
    ).toBe('residual')
  })
})

describe('buildWatchlistSymbols', () => {
  it('unions subscribed, position streams, and watchlist — not quotesMap keys', () => {
    const symbols = buildWatchlistSymbols({
      subscribedTickers: ['SPY'],
      streamHostSymbols: ['NVDA'],
      streamSecondarySymbols: [],
      watchlistSymbols: ['CAVA'],
    })
    expect(symbols).toEqual(['CAVA', 'NVDA', 'SPY'])
  })

  it('does not require quoteSymbolKeys (fromQuotes removed)', () => {
    const symbols = buildWatchlistSymbols({
      subscribedTickers: [],
      streamHostSymbols: ['AAPL'],
      streamSecondarySymbols: ['TSLA'],
    })
    expect(symbols).toEqual(['AAPL', 'TSLA'])
  })
})

describe('trimStaleStkQuotes', () => {
  it('removes STK keys not in keep set and preserves OPT keys', () => {
    const map: Record<string, QuoteItem> = {
      NVDA: { symbol: 'NVDA', last: 100, bid: 99, ask: 101, sec_type: 'STK' },
      SPY: { symbol: 'SPY', last: 400, bid: 399, ask: 401, sec_type: 'STK' },
      'AAPL|OPT|20250117|150|C': {
        symbol: 'AAPL',
        contract_key: 'AAPL|OPT|20250117|150|C',
        sec_type: 'OPT',
        last: 5,
        bid: 4.5,
        ask: 5.5,
      },
    }
    const trimmed = trimStaleStkQuotes(map, new Set(['NVDA']))
    expect(trimmed.NVDA).toBeDefined()
    expect(trimmed.SPY).toBeUndefined()
    expect(trimmed['AAPL|OPT|20250117|150|C']).toBeDefined()
  })
})

describe('splitWatchingAndMarketStreams', () => {
  it('sends positions to marketStreamsRows and observe-only to bottom panes', () => {
    const wl = new Map<string, WatchlistItem>([
      ['CAVA', { symbol: 'CAVA', category: 'Watching', sec_type: 'STK' } as WatchlistItem],
    ])
    const rows: MarketStreamsRow[] = [
      row({ symbol: 'NVDA', qty: 10, symbolSource: 'position', category: 'Core' }),
      row({
        symbol: 'CAVA',
        qty: null,
        symbolSource: 'watchlist',
        isInWatchlist: true,
        category: 'Watching',
      }),
      row({ symbol: 'SPY', qty: null, symbolSource: 'on-demand' }),
      row({ symbol: 'GHOST', qty: 0, symbolSource: 'residual' }),
    ]
    const split = splitWatchingAndMarketStreams(rows, wl)
    expect(split.marketStreamsRows.map(r => r.symbol)).toEqual(['NVDA'])
    expect(split.watchingTickerRows.map(r => r.symbol)).toEqual(['CAVA'])
    expect(split.subscribedTickerRows.map(r => r.symbol).sort()).toEqual(['GHOST', 'SPY'])
    expect(split.observeRows.map(r => r.symbol).sort()).toEqual(['CAVA', 'GHOST', 'SPY'])
  })

  it('does not leave observe-only symbols in the top Market Streams sheet', () => {
    const wl = new Map<string, WatchlistItem>()
    const rows = [
      row({ symbol: 'AAPL', qty: null, symbolSource: 'on-demand' as SymbolSource }),
      row({ symbol: 'QQQ', qty: null, symbolSource: 'gateway-default' as SymbolSource }),
    ]
    const { marketStreamsRows } = splitWatchingAndMarketStreams(rows, wl)
    expect(marketStreamsRows).toHaveLength(0)
  })
})

describe('buildMarketStreamsRowForSymbol symbolSource', () => {
  it('sets position source when account has STK qty', () => {
    const accounts: IbAccountSnapshot[] = [
      {
        account_id: 'DU1',
        positions: [
          {
            symbol: 'NVDA',
            secType: 'STK',
            position: 2,
            avgCost: 100,
          },
        ],
      } as IbAccountSnapshot,
    ]
    const built = buildMarketStreamsRowForSymbol({
      symbol: 'NVDA',
      accounts,
      quotesMap: {},
      benchmarks: {},
      streamHostId: 'DU1',
      streamSecondaryId: null,
      hasStreamAccounts: true,
      wishlistSet: new Set(),
      subscribedSymbols: new Set(['NVDA']),
    })
    expect(built.symbolSource).toBe('position')
    expect(hasPosition(built)).toBe(true)
  })

  it('sets on-demand when subscribed without position or watchlist', () => {
    const built = buildMarketStreamsRowForSymbol({
      symbol: 'SPY',
      accounts: [],
      quotesMap: {},
      benchmarks: {},
      streamHostId: null,
      streamSecondaryId: null,
      hasStreamAccounts: false,
      wishlistSet: new Set(),
      subscribedSymbols: new Set(['SPY']),
    })
    expect(built.symbolSource).toBe('on-demand')
    expect(isObserveOnly(built)).toBe(true)
  })
})
