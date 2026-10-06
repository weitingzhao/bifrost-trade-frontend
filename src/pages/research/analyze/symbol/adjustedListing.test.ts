import { describe, expect, it } from 'vitest'
import type { ExhibitPayload } from '@/api/research/exhibit'
import { adjustedOnly, chainListing, isAdjustedOptionTicker, optionMetricsEmpty, optionRoot } from './adjustedListing'

// Invented tickers.
describe('optionRoot / isAdjustedOptionTicker — Research’s rule, read off the ticker', () => {
  it('takes the root before the 15-character date, right and strike', () => {
    expect(optionRoot('O:ZQX1261016C00000500')).toBe('ZQX1')
    expect(optionRoot('O:ZQX261016P00012500')).toBe('ZQX')
    expect(optionRoot('O:SHORT')).toBeNull()
  })
  it('an adjusted root ends in a digit; a root alias does not', () => {
    expect(isAdjustedOptionTicker('O:ZQX1261016C00000500')).toBe(true)
    expect(isAdjustedOptionTicker('O:ZQXW261016C00000500')).toBe(false)
    expect(isAdjustedOptionTicker(null)).toBe(false)
  })
})

describe('chainListing / adjustedOnly', () => {
  it('a chain of adjusted contracts only', () => {
    const l = chainListing([
      { option_ticker: 'O:ZQX1261016C00000500' },
      { option_ticker: 'O:ZQX1261016P00001000' },
    ])
    expect(l).toEqual({ standard: 0, adjusted: 2, adjustedRoots: ['ZQX1'] })
    expect(adjustedOnly(l)).toBe(true)
  })
  it('one standard contract beside them is not adjusted-only', () => {
    const l = chainListing([{ option_ticker: 'O:ZQX1261016C00000500' }, { option_ticker: 'O:ZQX261016C00000500' }])
    expect(adjustedOnly(l)).toBe(false)
  })
  it('an empty chain is not adjusted-only', () => {
    expect(adjustedOnly(chainListing([]))).toBe(false)
  })
})

function ex(lens: string, freshness: ExhibitPayload['freshness'], caveats: string[] = []): ExhibitPayload {
  return { lens, symbol: 'ZQX', freshness, caveats } as unknown as ExhibitPayload
}

describe('optionMetricsEmpty', () => {
  const lenses = ['iv_rank', 'gex_regime', 'opex_pin', 'order_sentiment']
  it('every option lens answered with no reading', () => {
    expect(optionMetricsEmpty(lenses.map((l) => ex(l, 'missing')))).toBe(true)
  })
  it('one lens with a reading is not empty', () => {
    expect(optionMetricsEmpty([...lenses.slice(1).map((l) => ex(l, 'missing')), ex('iv_rank', 'fresh')])).toBe(false)
  })
  it('a failed builder is a failure, not an absence', () => {
    expect(
      optionMetricsEmpty([...lenses.slice(1).map((l) => ex(l, 'missing')), ex('iv_rank', 'missing', ['lens failed: boom'])]),
    ).toBe(false)
  })
  it('a lens not answered yet is not empty', () => {
    expect(optionMetricsEmpty(lenses.slice(1).map((l) => ex(l, 'missing')))).toBe(false)
  })
})
