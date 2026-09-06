import { describe, it, expect } from 'vitest'
import { buildSpotResolver, spotMixOf } from './spotPrice'
import type { QuoteItem } from '@/types/market'
import type { LivePositionRow } from '@/types/positions'

const quote = (symbol: string, last: number | null, ts = 1_700_000_000): QuoteItem =>
  ({ symbol, last, bid: -1, ask: -1, mid: null, ts }) as unknown as QuoteItem
const stock = (symbol: string, price: number | null, price_updated_at: number | null = 1_699_990_000, account_id = 'U1'): LivePositionRow =>
  ({ symbol, price, position: 100, secType: 'STK', account_id, price_updated_at }) as unknown as LivePositionRow

describe('buildSpotResolver', () => {
  it('a live last wins over the broker mark', () => {
    const r = buildSpotResolver({ NVDA: quote('NVDA', 185.2) }, [stock('NVDA', 183.885)])
    expect(r('NVDA')).toEqual({ price: 185.2, source: 'live', asOf: 1_700_000_000 })
  })
  it('falls back to the broker mark, with its own time stamp, when last is null', () => {
    const r = buildSpotResolver({ NVDA: quote('NVDA', null) }, [stock('NVDA', 183.885, 1_699_990_000)])
    expect(r('nvda')).toEqual({ price: 183.885, source: 'mark', asOf: 1_699_990_000 })
  })
  it('keeps the fresher of two accounts marks', () => {
    const r = buildSpotResolver({}, [stock('NVDA', 183.885, 100, 'U1'), stock('NVDA', 184.1, 200, 'U2')])
    expect(r('NVDA')).toEqual({ price: 184.1, source: 'mark', asOf: 200 })
  })
  it('a symbol with no quote and no held shares is unknown, never a guess', () => {
    const r = buildSpotResolver({ DDOG: quote('DDOG', null) }, [stock('DDOG', null)])
    expect(r('DDOG')).toBeNull()
    expect(r('FN')).toBeNull()
  })
  it('an option row is never a mark for its underlying', () => {
    const r = buildSpotResolver({}, [{ ...stock('NVDA', 12.5), secType: 'OPT' } as LivePositionRow])
    expect(r('NVDA')).toBeNull()
  })
})

describe('spotMixOf', () => {
  it('counts how the legs are priced and remembers the oldest mark', () => {
    const r = buildSpotResolver({ A: quote('A', 10) }, [stock('B', 20, 500), stock('C', 30, 300)])
    expect(spotMixOf(['A', 'B', 'C', 'D'], r)).toEqual({ live: 1, mark: 2, none: 1, oldestMarkAsOf: 300 })
  })
})
