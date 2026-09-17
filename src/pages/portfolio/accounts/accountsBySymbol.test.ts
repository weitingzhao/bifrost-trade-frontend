import { describe, expect, it } from 'vitest'
import { buildBySymbolRows, unrepresentedNote } from './accountsBySymbol'
import type { LivePositionRow } from '@/types/positions'

function stock(over: Partial<LivePositionRow> & { symbol: string }): LivePositionRow {
  return {
    account_id: 'U17123565',
    secType: 'STK',
    position: 100,
    avgCost: 50,
    price: 60,
    category: 'Option leg',
    ...over,
  }
}

describe('the by-symbol table', () => {
  it('sorts by value, because ranking is the thing a ring throws away', () => {
    const stocks = [
      stock({ symbol: 'SMALL', position: 10, price: 10 }),
      stock({ symbol: 'BIG', position: 100, price: 100 }),
      stock({ symbol: 'MID', position: 50, price: 20 }),
    ]
    const { rows } = buildBySymbolRows({
      stocks,
      allPositions: stocks,
      quotesBySymbol: {},
      benchBySymbol: {},
      totalNetLiq: 20000,
    })
    expect(rows.map((r) => r.symbol)).toEqual(['BIG', 'MID', 'SMALL'])
    expect(rows[0].value).toBe(10000)
    expect(rows[0].shareOfNetLiq).toBeCloseTo(50)
  })

  it('adds the same symbol across accounts into one row and names both', () => {
    const stocks = [
      stock({ symbol: 'NVDA', account_id: 'U17123565', position: 300, price: 100 }),
      stock({ symbol: 'NVDA', account_id: 'U8829175', position: 200, price: 100 }),
    ]
    const { rows } = buildBySymbolRows({
      stocks,
      allPositions: stocks,
      quotesBySymbol: {},
      benchBySymbol: {},
      totalNetLiq: 1000000,
    })
    expect(rows).toHaveLength(1)
    expect(rows[0].quantity).toBe(500)
    expect(rows[0].accountIds).toEqual(['U17123565', 'U8829175'])
  })

  it('carries the Owner\u2019s bucket, not a broker field', () => {
    const stocks = [
      stock({ symbol: 'SGOV', category: 'Cash' }),
      stock({ symbol: 'PFF', category: 'Fix Income' }),
      stock({ symbol: 'NVDA', category: 'Option leg' }),
    ]
    const { rows } = buildBySymbolRows({
      stocks,
      allPositions: stocks,
      quotesBySymbol: {},
      benchBySymbol: {},
      totalNetLiq: 1,
    })
    const bucketOf = (s: string) => rows.find((r) => r.symbol === s)?.bucket
    expect(bucketOf('SGOV')).toBe('cash_like')
    expect(bucketOf('PFF')).toBe('fixed_income')
    expect(bucketOf('NVDA')).toBe('core')
  })

  // K15. On DEV the broker sends no option quote at all, so six underlyings hold
  // a position that no row here can size. Leaving them out silently is the
  // dangerous read: it looks like there is no position.
  it('names the symbols that hold a position no row represents', () => {
    const stocks = [stock({ symbol: 'NVDA' })]
    const options: LivePositionRow[] = ['CBRS', 'DDOG', 'FN'].map((symbol) => ({
      account_id: 'U17123565',
      secType: 'OPT',
      symbol,
      position: -1,
      price: null,
      avgCost: 1000,
    }))
    const { rows, unrepresented } = buildBySymbolRows({
      stocks,
      allPositions: [...stocks, ...options],
      quotesBySymbol: {},
      benchBySymbol: {},
      totalNetLiq: 1000,
    })
    expect(rows.map((r) => r.symbol)).toEqual(['NVDA'])
    expect(unrepresented).toEqual(['CBRS', 'DDOG', 'FN'])
    expect(unrepresentedNote(unrepresented)).toContain(
      'a slice that is not there looks like a holding that is not there',
    )
  })

  it('leaves a closed line out without calling it unrepresented', () => {
    const stocks = [stock({ symbol: 'NVDA' }), stock({ symbol: 'GONE', position: 0 })]
    const { rows, unrepresented } = buildBySymbolRows({
      stocks,
      allPositions: stocks,
      quotesBySymbol: {},
      benchBySymbol: {},
      totalNetLiq: 1000,
    })
    expect(rows.map((r) => r.symbol)).toEqual(['NVDA'])
    expect(unrepresented).toEqual([])
  })

  it('reads a share of nothing as no reading rather than as zero percent', () => {
    const stocks = [stock({ symbol: 'NVDA' })]
    const { rows } = buildBySymbolRows({
      stocks,
      allPositions: stocks,
      quotesBySymbol: {},
      benchBySymbol: {},
      totalNetLiq: 0,
    })
    expect(rows[0].shareOfNetLiq).toBeNull()
  })
})
