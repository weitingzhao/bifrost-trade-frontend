import { describe, expect, it } from 'vitest'
import type { IbPositionRow } from '@/types/monitor'
import type { QuoteItem } from '@/types/market'
import {
  calcOptionPremiumTotal,
  collectUnderlyingSpots,
  computeOptionPositionRowMetrics,
  optionIntrinsic,
} from './accountsOptionPositions'

function opt(overrides: Partial<IbPositionRow> = {}): IbPositionRow {
  return {
    symbol: 'NVDA',
    secType: 'OPT',
    position: -2,
    avgCost: 5.5,
    price: 5,
    right: 'C',
    strike: 900,
    expiry: '20260620',
    contract_key: 'NVDA|OPT|20260620|900|C',
    ...overrides,
  } as IbPositionRow
}

function quote(overrides: Partial<QuoteItem> = {}): QuoteItem {
  return { last: null, bid: null, ask: null, ...overrides }
}

describe('optionIntrinsic', () => {
  it('computes call intrinsic from spot', () => {
    expect(optionIntrinsic('C', 100, 110)).toBe(10)
    expect(optionIntrinsic('C', 100, 90)).toBe(0)
  })

  it('computes put intrinsic from spot', () => {
    expect(optionIntrinsic('P', 100, 90)).toBe(10)
  })
})

describe('computeOptionPositionRowMetrics', () => {
  it('computes premium as negative qty * avgCost', () => {
    const m = computeOptionPositionRowMetrics(opt(), quote({ last: 6, timestamp: 1_700_000_000 }))
    expect(m.premium).toBeCloseTo(-(-2 * 5.5))
    expect(m.side).toBe('Short')
    expect(m.dailyPct).toBeCloseTo(((6 - 5) / 5) * 100)
    expect(m.dailyUsd).toBeCloseTo((6 - 5) * -2)
    expect(m.changePct).toBeCloseTo(((6 - 5.5) / 5.5) * 100)
    expect(m.changeUsd).toBeCloseTo((6 - 5.5) * -2)
    expect(m.updTs).toBe(1_700_000_000)
  })

  it('uses unrealized_pnl when present', () => {
    const m = computeOptionPositionRowMetrics(
      opt({ unrealized_pnl: 120 }),
      quote({ last: 6 }),
    )
    expect(m.changeUsd).toBe(120)
  })
})

describe('calcOptionPremiumTotal', () => {
  it('sums premium across positions', () => {
    const total = calcOptionPremiumTotal([
      opt({ position: -2, avgCost: 5 }),
      opt({ position: 1, avgCost: 3, contract_key: 'B' }),
    ])
    expect(total).toBeCloseTo(-(-2 * 5) + -(1 * 3))
  })
})

describe('collectUnderlyingSpots', () => {
  it('collects unique underlying last prices', () => {
    const spots = collectUnderlyingSpots(
      [opt({ symbol: 'NVDA' }), opt({ symbol: 'AAPL', contract_key: 'A' })],
      { NVDA: quote({ last: 900 }), AAPL: quote({ last: 200 }) },
    )
    expect(spots).toEqual({ NVDA: 900, AAPL: 200 })
  })
})
