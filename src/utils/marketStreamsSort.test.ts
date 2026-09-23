import { describe, expect, it } from 'vitest'
import type { MarketStreamsRow, OptPositionRow } from '@/utils/marketStreamsRows'
import {
  buildUnifiedGroupedRows,
  MARKET_STREAMS_SORT_LINE,
  marketStreamsSortFamily,
  type MarketStreamsSortMode,
} from './marketStreamsSort'

// Invented rows. Only the fields the grouping reads.
const stk = (symbol: string, qty: number | null, pnlCost: number | null): MarketStreamsRow =>
  ({ symbol, qty, pnlCost }) as unknown as MarketStreamsRow
const opt = (symbol: string, qty: number, expiry: string): OptPositionRow =>
  ({ symbol, qty, expiry, strike: 100, right: 'P' }) as unknown as OptPositionRow

const STOCKS = [stk('AAA', 10, 5), stk('BBB', -4, -2), stk('CCC', 0, null), stk('DDD', null, null)]
const OPTIONS = [opt('AAA', -1, '20261120'), opt('BBB', 2, '20261016')]

const groupsFor = (mode: MarketStreamsSortMode) =>
  buildUnifiedGroupedRows({ mode, filteredRows: STOCKS, optPositionRows: OPTIONS, optPnl: () => null }) ?? []

describe('Type × side keeps what the book holds none of, in both directions', () => {
  it('lists No position last on ▲ and on ▼ alike', () => {
    for (const mode of [6, 7] as const) {
      const g = groupsFor(mode)
      const last = g[g.length - 1]
      expect(last?.label).toBe('No position')
      expect(last?.stkRows.map((r: MarketStreamsRow) => r.symbol).sort()).toEqual(['CCC', 'DDD'])
    }
  })

  it('orders the groups the way the sort line says they are ordered', () => {
    expect(groupsFor(6).map((g) => g.label)).toEqual([
      'Total Long Stocks',
      'Total Short Options',
      'Total Short Stocks',
      'Total Long Options',
      'No position',
    ])
    expect(groupsFor(7).map((g) => g.label)).toEqual([
      'Total Short Options',
      'Total Long Stocks',
      'Total Long Options',
      'Total Short Stocks',
      'No position',
    ])
  })
})

describe('the sort line', () => {
  const modes = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const

  it('names every mode, and only Default hands row order to the reader', () => {
    for (const m of modes) {
      const line = MARKET_STREAMS_SORT_LINE[m]
      expect(line.name.length).toBeGreaterThan(0)
      expect(line.order.length).toBeGreaterThan(0)
      expect(line.hint).toBe(m === 1 ? 'drag ⋮⋮ to reorder rows and categories' : 'row order is yours only in Default')
    }
  })

  it('gives both arrows of a mode one family, so they share an accent', () => {
    expect(modes.map(marketStreamsSortFamily)).toEqual([
      'def', 'alpha', 'alpha', 'type', 'type', 'side', 'side', 'exp', 'exp',
    ])
  })
})

describe('a group total is a sum of what is known, never of what is not', () => {
  it('is null when no row in the group has a Since $, not zero', () => {
    const shortOpts = groupsFor(6).find((g) => g.label === 'Total Short Options')
    expect(shortOpts?.totalPnl).toBeNull()
    expect(shortOpts?.unpriced).toBe(1)
  })

  it('sums the priced rows and counts the rest', () => {
    const g = buildUnifiedGroupedRows({
      mode: 4,
      filteredRows: [stk('AAA', 10, 5), stk('BBB', 3, null), stk('EEE', 2, -1.5)],
      optPositionRows: [],
      optPnl: () => null,
    })
    const stocks = g?.find((x) => x.label === 'Total Stocks')
    expect(stocks?.totalPnl).toBe(3.5)
    expect(stocks?.unpriced).toBe(1)
  })
})
