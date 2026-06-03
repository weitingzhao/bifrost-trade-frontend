import { describe, it, expect } from 'vitest'
import { mergeQuoteIntoMap } from './useQuoteStream'
import { mergeQuotesIntoSymbolMap } from '@/utils/marketStreamsRows'
import type { QuoteItem } from '@/types/market'

function makeQuote(overrides: Partial<QuoteItem> = {}): QuoteItem {
  return {
    last: 100,
    bid: 99.5,
    ask: 100.5,
    ...overrides,
  }
}

describe('mergeQuoteIntoMap', () => {
  it('indexes STK ingestor ticks by uppercase symbol, not contract_key', () => {
    const q = makeQuote({
      symbol: 'NVDA',
      contract_key: 'NVDA|STK|||',
      sec_type: 'STK',
    })
    const result = mergeQuoteIntoMap({}, q)
    expect(result.NVDA).toBe(q)
    expect(result['NVDA|STK|||']).toBeUndefined()
  })

  it('falls back to symbol when contract_key is undefined', () => {
    const q = makeQuote({ symbol: 'TSLA' })
    const result = mergeQuoteIntoMap({}, q)
    expect(result.TSLA).toBe(q)
  })

  it('skips quotes with no symbol', () => {
    const prev = { AAPL: makeQuote({ symbol: 'AAPL' }) }
    const q = makeQuote()
    const result = mergeQuoteIntoMap(prev, q)
    expect(result).toEqual(prev)
    expect(Object.keys(result)).toEqual(['AAPL'])
  })

  it('merges into existing map without mutating prev', () => {
    const prev = { AAPL: makeQuote({ symbol: 'AAPL', last: 180 }) }
    const q = makeQuote({ symbol: 'TSLA', last: 250 })
    const result = mergeQuoteIntoMap(prev, q)
    expect(result.AAPL.last).toBe(180)
    expect(result.TSLA.last).toBe(250)
    expect('TSLA' in prev).toBe(false)
  })

  it('overwrites an existing symbol key with updated quote', () => {
    const old = makeQuote({ symbol: 'AAPL', last: 180 })
    const updated = makeQuote({ symbol: 'AAPL', last: 185 })
    const result = mergeQuoteIntoMap({ AAPL: old }, updated)
    expect(result.AAPL.last).toBe(185)
  })

  it('stores OPT quotes by contract_key without overwriting STK symbol', () => {
    const stk = makeQuote({ symbol: 'AAPL', contract_key: 'AAPL|STK|||', sec_type: 'STK', last: 180 })
    const opt = makeQuote({
      symbol: 'AAPL',
      contract_key: 'AAPL|OPT|20250117|150|C',
      sec_type: 'OPT',
      last: 5,
    })
    let map = mergeQuoteIntoMap({}, stk)
    map = mergeQuoteIntoMap(map, opt)
    expect(map.AAPL.last).toBe(180)
    expect(map['AAPL|OPT|20250117|150|C'].last).toBe(5)
  })
})

describe('mergeQuotesIntoSymbolMap', () => {
  it('batch-merges multiple STK ticks by symbol', () => {
    const quotes = [
      makeQuote({ symbol: 'nvda', contract_key: 'NVDA|STK|||', sec_type: 'STK' }),
      makeQuote({ symbol: 'tsla', contract_key: 'TSLA|STK|||', sec_type: 'STK' }),
    ]
    const result = mergeQuotesIntoSymbolMap({}, quotes)
    expect(result.NVDA).toBe(quotes[0])
    expect(result.TSLA).toBe(quotes[1])
  })
})
