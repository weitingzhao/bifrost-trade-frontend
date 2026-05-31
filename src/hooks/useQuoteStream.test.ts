import { describe, it, expect } from 'vitest'
import { mergeQuoteIntoMap } from './useQuoteStream'
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
  it('uses contract_key as map key when present', () => {
    const q = makeQuote({ contract_key: 'AAPL_C_150_20250117', symbol: 'AAPL' })
    const result = mergeQuoteIntoMap({}, q)
    expect(result['AAPL_C_150_20250117']).toBe(q)
    expect(result['AAPL']).toBeUndefined()
  })

  it('falls back to symbol when contract_key is undefined', () => {
    const q = makeQuote({ symbol: 'TSLA' })
    const result = mergeQuoteIntoMap({}, q)
    expect(result['TSLA']).toBe(q)
  })

  it('falls back to symbol when contract_key is null', () => {
    const q = makeQuote({ contract_key: undefined, symbol: 'MSFT' })
    const result = mergeQuoteIntoMap({}, q)
    expect(result['MSFT']).toBe(q)
  })

  it('returns prev unchanged when both contract_key and symbol are absent', () => {
    const prev = { AAPL: makeQuote({ symbol: 'AAPL' }) }
    const q = makeQuote()  // no symbol, no contract_key
    const result = mergeQuoteIntoMap(prev, q)
    expect(result).toBe(prev)
  })

  it('merges into existing map without mutating prev', () => {
    const prev = { AAPL: makeQuote({ symbol: 'AAPL', last: 180 }) }
    const q = makeQuote({ symbol: 'TSLA', last: 250 })
    const result = mergeQuoteIntoMap(prev, q)
    expect(result['AAPL'].last).toBe(180)
    expect(result['TSLA'].last).toBe(250)
    // prev is not mutated
    expect('TSLA' in prev).toBe(false)
  })

  it('overwrites an existing key with updated quote', () => {
    const old = makeQuote({ symbol: 'AAPL', last: 180 })
    const updated = makeQuote({ symbol: 'AAPL', last: 185 })
    const result = mergeQuoteIntoMap({ AAPL: old }, updated)
    expect(result['AAPL'].last).toBe(185)
  })

  it('returns a new object reference (immutability)', () => {
    const prev = { AAPL: makeQuote({ symbol: 'AAPL' }) }
    const q = makeQuote({ symbol: 'AAPL', last: 999 })
    const result = mergeQuoteIntoMap(prev, q)
    expect(result).not.toBe(prev)
  })

  it('prefers contract_key over symbol when both are present', () => {
    const q = makeQuote({ contract_key: 'AAPL_C_200', symbol: 'AAPL' })
    const result = mergeQuoteIntoMap({}, q)
    expect('AAPL_C_200' in result).toBe(true)
    expect('AAPL' in result).toBe(false)
  })
})
