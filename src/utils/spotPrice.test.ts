import { describe, it, expect } from 'vitest'
import { buildSpotResolver, describeSpot, repriceRows, spotMixOf, type LatestBar } from './spotPrice'
import type { QuoteItem } from '@/types/market'
import type { LivePositionRow } from '@/types/positions'

const quote = (symbol: string, last: number | null, ts = 1_757_000_000): QuoteItem =>
  ({ symbol, last, bid: -1, ask: -1, mid: null, ts }) as unknown as QuoteItem
const stock = (
  symbol: string,
  price: number | null,
  price_updated_at: number | null = MARCH,
  account_id = 'U1',
): LivePositionRow =>
  ({ symbol, price, position: 100, secType: 'STK', account_id, price_updated_at, daily_prev_close: 1 }) as unknown as LivePositionRow

// 2026-03-16 and 2026-09-04, the two stamps the DEV data actually carried.
const MARCH = 1_773_694_740
const FRIDAY = 1_788_480_000
const bars: Record<string, LatestBar> = { NVDA: { close: 230.36, prevClose: 228.45, date: FRIDAY } }

describe('buildSpotResolver', () => {
  it('a live last wins over everything', () => {
    const r = buildSpotResolver({ NVDA: quote('NVDA', 185.2) }, [stock('NVDA', 183.885)], bars)
    expect(r('NVDA')).toEqual({ price: 185.2, source: 'live', asOf: 1_757_000_000 })
  })
  it("a dated close beats a mark that is older than the close — the March mark never prices a September book", () => {
    const r = buildSpotResolver({ NVDA: quote('NVDA', null) }, [stock('NVDA', 183.885, MARCH)], bars)
    expect(r('nvda')).toEqual({ price: 230.36, source: 'close', asOf: FRIDAY })
  })
  it('a mark stamped after the close is the fresher price and wins', () => {
    const r = buildSpotResolver({}, [stock('NVDA', 231.5, FRIDAY + 3600)], bars)
    expect(r('NVDA')).toEqual({ price: 231.5, source: 'mark', asOf: FRIDAY + 3600 })
  })
  it('with no bar the mark is all there is, and says so', () => {
    const r = buildSpotResolver({}, [stock('RKLB', 71.885, MARCH)])
    expect(r('RKLB')).toEqual({ price: 71.885, source: 'mark', asOf: MARCH })
  })
  it('keeps the fresher of two accounts marks', () => {
    const r = buildSpotResolver({}, [stock('NVDA', 183.885, 100, 'U1'), stock('NVDA', 184.1, 200, 'U2')])
    expect(r('NVDA')).toEqual({ price: 184.1, source: 'mark', asOf: 200 })
  })
  it('a symbol with no quote, no bar and no held shares is unknown, never a guess', () => {
    const r = buildSpotResolver({ DDOG: quote('DDOG', null) }, [stock('DDOG', null)])
    expect(r('DDOG')).toBeNull()
    expect(r('FN')).toBeNull()
  })
  it('an option row is never a mark for its underlying', () => {
    const r = buildSpotResolver({}, [{ ...stock('NVDA', 12.5), secType: 'OPT' } as LivePositionRow])
    expect(r('NVDA')).toBeNull()
  })
})

describe('spotMixOf / describeSpot', () => {
  it('counts each source and remembers the oldest close and mark', () => {
    const r = buildSpotResolver({ A: quote('A', 10) }, [stock('B', 20, 500), stock('C', 30, 300)], { D: { close: 5, prevClose: null, date: FRIDAY } })
    expect(spotMixOf(['A', 'B', 'C', 'D', 'E'], r)).toEqual({
      live: 1,
      close: 1,
      mark: 2,
      none: 1,
      oldestCloseAsOf: FRIDAY,
      oldestMarkAsOf: 300,
    })
  })
  it('names the source and its date next to the number', () => {
    expect(describeSpot({ price: 1, source: 'live', asOf: 1 })).toBe('live')
    expect(describeSpot({ price: 1, source: 'close', asOf: FRIDAY })).toMatch(/^close \d\d-\d\d$/)
    expect(describeSpot(null)).toBe('no quote')
  })
})

describe('repriceRows', () => {
  it('writes the resolved price and the bar\'s previous close onto stock rows, leaves options alone', () => {
    const r = buildSpotResolver({}, [stock('NVDA', 183.885, MARCH)], bars)
    const rows = repriceRows([stock('NVDA', 183.885, MARCH), { ...stock('NVDA', 9), secType: 'OPT' } as LivePositionRow], r, bars)
    expect(rows[0].price).toBe(230.36)
    expect(rows[0].price_updated_at).toBe(FRIDAY)
    expect(rows[0].daily_prev_close).toBe(228.45)
    expect(rows[1].price).toBe(9)
  })
  it('a row with no resolvable price is returned unchanged', () => {
    const r = buildSpotResolver({}, [])
    const row = stock('XYZ', null)
    expect(repriceRows([row], r)[0]).toBe(row)
  })
})
