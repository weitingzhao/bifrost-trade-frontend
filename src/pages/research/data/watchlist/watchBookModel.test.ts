/**
 * The Watchlist's row join, and the three readings that are easy to get
 * subtly wrong.
 *
 * Each of these was a measurement before it was a test: the thesis is a
 * hypothesis that names the symbol rather than a field on the watch, the IV
 * absence has two different reasons and one of them is not a failure, and the
 * day's base is the *prior settled* close, which is not always the benchmark's
 * `close`.
 */
import { describe, expect, it } from 'vitest'
import type { DailyBenchmark, QuoteItem, WatchlistItem } from '@/types/market'
import type { Hypothesis } from '@/api/researchHypothesis'
import type { IvPercentileRow } from '@/types/ivRadar'
import { watchBookRows, watchBookStanding } from './watchBookModel'

const NOW = Date.parse('2026-09-22T12:00:00Z')

function item(symbol: string, over: Partial<WatchlistItem> = {}): WatchlistItem {
  return {
    contract_key: `${symbol}|STK|||`,
    symbol,
    sec_type: 'STK',
    optionable: true,
    category: 'Watching',
    category_id: 1,
    source: 'manual',
    // Seconds, as the store writes them.
    created_at: (NOW - 4 * 86_400_000) / 1000,
    ...over,
  } as WatchlistItem
}

function hypothesis(symbols: string[], over: Partial<Hypothesis> = {}): Hypothesis {
  return {
    id: symbols.join('-'),
    title: `${symbols[0]} holds above the 50-day`,
    thesis: 'the long version',
    status: 'active',
    symbols,
    tags: [],
    created_at: '2026-09-18T00:00:00Z',
    updated_at: '2026-09-18T00:00:00Z',
    ...over,
  } as Hypothesis
}

const QUOTES: Record<string, QuoteItem> = {
  AMD: { symbol: 'AMD', last: 110, bid: 109, ask: 111 },
}

const SETTLED: DailyBenchmark = {
  bar_time: 1,
  close: 100,
  prev_close: 90,
  is_today: false,
  is_stale: false,
}

const ivMap = (m: Record<string, number | null>): Map<string, IvPercentileRow | null> =>
  new Map(
    Object.entries(m).map(([k, v]) => [
      k,
      v == null ? null : ({ symbol: k, iv_rank_1y: v } as IvPercentileRow),
    ]),
  )

describe('watchBookRows', () => {
  it('measures the day against the prior settled close, not the live one', () => {
    const [row] = watchBookRows([item('AMD')], QUOTES, { AMD: SETTLED }, ivMap({}), [], NOW)
    // 110 against a settled 100 — the shared rule, not a second one.
    expect(row.dayPct).toBeCloseTo(10, 5)
  })

  it('uses the benchmark’s prior close once today’s bar has printed', () => {
    const today = { ...SETTLED, is_today: true }
    const [row] = watchBookRows([item('AMD')], QUOTES, { AMD: today }, ivMap({}), [], NOW)
    // Now the base is 90: measuring today against today's own close is zero
    // by construction, which is the bug this branch exists to avoid.
    expect(row.dayPct).toBeCloseTo((110 / 90 - 1) * 100, 5)
  })

  it('finds the thesis in the belief that names the symbol', () => {
    const rows = watchBookRows(
      [item('AMD'), item('GLD')],
      QUOTES,
      {},
      ivMap({}),
      [hypothesis(['AMD'])],
      NOW,
    )
    expect(rows[0].thesis?.title).toBe('AMD holds above the 50-day')
    expect(rows[1].thesis).toBeNull()
  })

  it('prefers a live belief over a settled one about the same name', () => {
    const rows = watchBookRows(
      [item('AMD')],
      QUOTES,
      {},
      ivMap({}),
      [
        hypothesis(['AMD'], { id: 'old', title: 'retired take', status: 'archived' }),
        hypothesis(['AMD'], { id: 'new', title: 'live take', status: 'active' }),
      ],
      NOW,
    )
    // A retired belief is a reason the name *had*; the row asks what is
    // holding it up now.
    expect(rows[0].thesis?.title).toBe('live take')
  })

  it('says why an IV rank is missing, and the two reasons are not the same', () => {
    const rows = watchBookRows(
      [item('SGOV', { category: 'Fix Income' }), item('NBIS'), item('AMD')],
      QUOTES,
      {},
      ivMap({ AMD: 64 }),
      [],
      NOW,
    )
    // A bond ETF has no chain to rank — an absence that is not a failure.
    expect(rows[0].ivAbsence).toContain('fixed-income')
    expect(rows[1].ivAbsence).toContain('no IV percentile row')
    expect(rows[2].ivAbsence).toBeNull()
    expect(rows[2].ivRank).toBe(64)
  })

  it('ages a watch by the day it was opened, and marks the design’s eighth', () => {
    const rows = watchBookRows(
      [
        item('A', { created_at: (NOW - 2 * 86_400_000) / 1000 }),
        item('B', { created_at: (NOW - 5 * 86_400_000) / 1000 }),
        item('C', { created_at: (NOW - 30 * 86_400_000) / 1000 }),
      ],
      {},
      {},
      ivMap({}),
      [],
      NOW,
    )
    expect(rows.map((r) => r.ageDays)).toEqual([2, 5, 30])
    expect(rows.map((r) => r.ageTone)).toEqual(['plain', 'aging', 'old'])
  })
})

describe('watchBookStanding', () => {
  it('counts what the header’s rule needs: how many names still have a reason', () => {
    const rows = watchBookRows(
      [item('AMD'), item('GLD'), item('MSFT')],
      QUOTES,
      {},
      ivMap({}),
      [hypothesis(['AMD'])],
      NOW,
    )
    expect(watchBookStanding(rows)).toMatchObject({ names: 3, withThesis: 1, withoutThesis: 2 })
  })
})
