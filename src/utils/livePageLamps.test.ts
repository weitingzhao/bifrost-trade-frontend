/**
 * The header's `streams N/M` — a fraction that must not invert.
 */
import { describe, expect, it } from 'vitest'
import type { QuoteItem } from '@/types/market'
import { countFreshQuotes } from './livePageLamps'

const q = (ts: number): QuoteItem => ({ symbol: 'X', last: 1, ts }) as QuoteItem

describe('countFreshQuotes', () => {
  it('counts against what the page asked for, not against the map', () => {
    // The map holds option contract keys as well as symbols. Counting it read
    // 27 of 23 on DEV — a fraction over one is not a reading.
    const map = { NVDA: q(1000), SPY: q(1000), 'NVDA|OPT|20261017|165|P': q(1000) }
    expect(countFreshQuotes(map, ['NVDA', 'SPY'], 1000)).toEqual({ fresh: 2, total: 2 })
  })

  it('does not call a quote older than a minute live', () => {
    // The window is 60s and the boundary is inclusive, so 940 is the last
    // timestamp that still counts at 1000.
    expect(countFreshQuotes({ NVDA: q(941) }, ['NVDA'], 1000).fresh).toBe(1)
    expect(countFreshQuotes({ NVDA: q(940) }, ['NVDA'], 1000).fresh).toBe(1)
    expect(countFreshQuotes({ NVDA: q(939) }, ['NVDA'], 1000).fresh).toBe(0)
    expect(countFreshQuotes({ NVDA: q(900) }, ['NVDA'], 1000).fresh).toBe(0)
  })

  it('counts a symbol that never answered in the denominator', () => {
    expect(countFreshQuotes({}, ['NVDA', 'SPY'], 1000)).toEqual({ fresh: 0, total: 2 })
  })

  it('does not double-count a key the page asked for twice', () => {
    expect(countFreshQuotes({ NVDA: q(1000) }, ['NVDA', 'NVDA'], 1000)).toEqual({ fresh: 1, total: 1 })
  })
})
