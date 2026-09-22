/**
 * The reading this panel must not fake: a tile with no feed behind it.
 */
import { describe, expect, it } from 'vitest'
import type { DailyBenchmark, QuoteItem } from '@/types/market'
import { referenceStanding, referenceTiles } from './referenceModel'

const bench = (over: Partial<DailyBenchmark> = {}): DailyBenchmark =>
  ({ bar_time: 1, close: 773.38, prev_close: 773.5, is_today: true, is_stale: false, ...over }) as DailyBenchmark

const quote = (last: number): QuoteItem =>
  ({ symbol: 'SPY', last, bid: last, ask: last, mid: last, ts: 1 }) as QuoteItem

describe('referenceTiles', () => {
  it('prices against the prior settled close, like every other surface', () => {
    // 773.44 against a 773.5 prev close — the shared daily-change rule, not a
    // second one written here.
    const [spy] = referenceTiles({ SPY: bench() }, { SPY: quote(773.44) })
    expect(spy).toMatchObject({ symbol: 'SPY', last: 773.44, live: true })
    // Percent units, not a fraction: QQQ closing 747.46 against 741.47 is
    // 0.81, and reading it as a fraction printed 80.8% on the live page.
    expect(spy.changePct).toBeCloseTo(-0.00776, 4)
    const [, qqq] = referenceTiles(
      { SPY: bench(), QQQ: bench({ close: 747.46, prev_close: 741.47 }) },
      {},
    )
    expect(qqq.changePct).toBeCloseTo(0.808, 3)
  })

  it('falls back to the settled close when the tape is not running', () => {
    const [spy] = referenceTiles({ SPY: bench() }, {})
    expect(spy).toMatchObject({ last: 773.38, live: false, unavailable: null })
  })

  it('marks VIX unavailable with its reason rather than substituting VXX', () => {
    // DEV 2026-09-22: VIX, ^VIX and VIX.IND all answer empty; VXX answers and
    // is an ETN on VIX futures, which is a different quantity.
    const vix = referenceTiles({}, {}).find((t) => t.symbol === 'VIX')
    expect(vix?.last).toBeNull()
    expect(vix?.unavailable).toContain('VXX is an ETN on VIX futures')
  })

  it('keeps every instrument in the design’s order, reading or not', () => {
    expect(referenceTiles({}, {}).map((t) => t.symbol)).toEqual([
      'SPY',
      'QQQ',
      'IWM',
      'VIX',
      'TLT',
    ])
  })
})

describe('referenceStanding', () => {
  it('names what is missing instead of quietly showing four tiles', () => {
    expect(referenceStanding(referenceTiles({ SPY: bench() }, {}))).toBe(
      '1 of 5 reading · QQQ, IWM, VIX, TLT unavailable',
    )
  })

  it('says nothing is missing when nothing is', () => {
    const all = Object.fromEntries(
      ['SPY', 'QQQ', 'IWM', 'VIX', 'TLT'].map((s) => [s, bench()]),
    )
    expect(referenceStanding(referenceTiles(all, {}))).toBe('5 of 5 reading')
  })
})

describe('backend-declared indices', () => {
  it('adds one the monitor declares, rather than fetching it and dropping it', () => {
    // `status.live_ui.reference_indices` answers [] on DEV — this is the path
    // that keeps meaning something if it ever fills.
    const tiles = referenceTiles({}, {}, ['dia', 'SPY'])
    expect(tiles.map((t) => t.symbol)).toEqual(['SPY', 'QQQ', 'IWM', 'VIX', 'TLT', 'DIA'])
    expect(tiles[5].why).toContain('declared by the monitor')
  })
})
