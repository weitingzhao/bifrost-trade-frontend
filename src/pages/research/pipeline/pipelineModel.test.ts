/**
 * The census mostly records what is *not* recorded, so the tests are mostly
 * about that: a page that owes a store must say which one and never show a
 * zero, and a page that owes none must be told apart from one that does.
 */
import { describe, expect, it } from 'vitest'
import {
  censusRows,
  censusTotals,
  oldestUntouched,
  stationReadings,
  type StoreReading,
} from './pipelineModel'

const NO_READINGS = new Map<string, StoreReading>()
const NO_ORIGINS = new Map<string, number>()

const READINGS = new Map<string, StoreReading>([
  ['/research/ratings/stocks', { made: 500, newest: '2026-09-19' }],
  ['/research/scan', { made: 500, newest: null }],
  // Handed a count on purpose: Narrative was once read off order flow's 100
  // rows, and a row that owes its store must not take one it is given.
  ['/research/narrative', { made: 100, newest: '2026-09-21T06:45:00Z' }],
  ['/research/backtest', { made: 43, newest: '2026-09-06T08:20:00Z' }],
])

const rowsAt = (origins = NO_ORIGINS) => censusRows(READINGS, origins)

describe('the four classes', () => {
  const rows = rowsAt()
  const by = (to: string) => rows.find((r) => r.to === to)!

  it('counts a store that exists', () => {
    expect(by('/research/ratings/stocks').made).toBe(500)
    expect(by('/research/ratings/stocks').storeState).toBe('has-store')
  })

  it('names the store a page owes instead of showing a zero', () => {
    // Owing a store is not having none: a screen is an object you fork and
    // cite, so something should be keeping it.
    for (const to of ['/research/screener', '/research/contract-screener', '/research/symbol', '/research/narrative', '/research/signal-decay']) {
      expect(by(to).storeState, to).toBe('store-owed')
      expect(by(to).made, to).toBeNull()
      expect(by(to).store, to).toBeTruthy()
      expect(by(to).note, to).toMatch(/store owed/)
    }
  })

  it('tells a page that owes nothing from one that owes a store', () => {
    // Compare assembles; History recomputes a denominator. Nobody names one
    // run of either again, so neither owes a record of it.
    for (const to of ['/research/compare', '/research/history']) {
      expect(by(to).storeState, to).toBe('no-store-owed')
      expect(by(to).note, to).toMatch(/no store owed/)
    }
  })

  it('keeps Alerts on the page and out of every denominator', () => {
    expect(by('/research/event-radar').storeState).toBe('off-bench')
    expect(censusTotals(rows).onBench).toBe(rows.length - 1)
    expect(stationReadings(rows).map((s) => s.station)).not.toContain('off-bench')
  })

  it('marks a page the design has and this side has not built', () => {
    // Decided against the app's own route table, because "not built" is a
    // fact about this side — Design's ruling on our question 3.1.
    expect(by('/research/narrative').pageBuilt).toBe(false)
    expect(by('/research/narrative').note).toMatch(/page not built/)
    expect(by('/research/ratings/stocks').pageBuilt).toBe(true)
  })

  it('does not count order flow as Narrative', () => {
    // Until 2026-09-23 this row read `/research/flow/sentiment` — options
    // order flow, no text — and called Narrative the one Analyze page with a
    // store. It owes one; the filings it would read are entitled and not yet
    // ingested, and the note says which of those it is.
    const narrative = by('/research/narrative')
    expect(narrative.made).toBeNull()
    expect(narrative.store).toBe('narrative_tag')
    expect(narrative.note).toMatch(/entitled and not yet ingested/)
  })
})

describe('a row can have moved on without made', () => {
  it('shows the numerator with no base, and says so', () => {
    // `origin_page` is real on a page that keeps no store: you know what came
    // out, not what it came out of.
    const rows = censusRows(READINGS, new Map([['/research/symbol', 2]]))
    const symbol = rows.find((r) => r.to === '/research/symbol')!
    expect(symbol.made).toBeNull()
    expect(symbol.movedOn).toBe(2)
    expect(symbol.note).toMatch(/2 out, base unknown/)
  })

  it('does not say it when nothing came out', () => {
    expect(rowsAt().find((r) => r.to === '/research/symbol')!.note).not.toMatch(/base unknown/)
  })
})

describe('stationReadings', () => {
  it('reports coverage beside stuck, because stuck alone misreads', () => {
    // Validate is fully stuck on one measurable page out of two; without
    // coverage that reads as the worst station rather than the thinnest.
    const validate = stationReadings(rowsAt()).find((s) => s.station === 'validate')!
    expect(validate.stuck).toBe(1)
    expect(validate.withStore).toBe(1)
    expect(validate.onBench).toBe(2)
  })

  it('reads Analyze as unmeasured, not as empty', () => {
    // None of its four pages keeps a store since Narrative stopped borrowing
    // order flow's, so there is no share to state — null, never 0%.
    const analyze = stationReadings(rowsAt()).find((s) => s.station === 'analyze')!
    expect(analyze.withStore).toBe(0)
    expect(analyze.onBench).toBe(4)
    expect(analyze.stuck).toBeNull()
  })

  it('counts a page that owes no store as on the bench', () => {
    // It is still a page you work at; only Alerts is excluded.
    const discover = stationReadings(rowsAt()).find((s) => s.station === 'discover')!
    expect(discover.onBench).toBe(4)
    expect(discover.withStore).toBe(2)
  })

  it('answers null rather than zero when a station has no store at all', () => {
    const none = stationReadings(censusRows(NO_READINGS, NO_ORIGINS))
    for (const s of none) expect(s.stuck, s.label).toBeNull()
  })

  it('lowers the stuck share as things leave', () => {
    const before = stationReadings(rowsAt()).find((s) => s.station === 'validate')!
    const after = stationReadings(rowsAt(new Map([['/research/backtest', 43]]))).find(
      (s) => s.station === 'validate',
    )!
    expect(before.stuck).toBe(1)
    expect(after.stuck).toBe(0)
  })
})

describe('censusTotals', () => {
  it('adds up only what is on the bench', () => {
    const t = censusTotals(rowsAt())
    expect(t.written).toBe(500 + 500 + 43)
    expect(t.left).toBe(0)
    expect(t.stillHere).toBe(t.written)
    expect(t.withStore).toBe(3)
  })

  it('counts separately what left a page with no base to measure it against', () => {
    const t = censusTotals(rowsAt(new Map([['/research/symbol', 3]])))
    expect(t.leftWithoutBase).toBe(3)
  })
})

describe('oldestUntouched', () => {
  it('ages by the engine stamp, not by a page-read log', () => {
    // The first scale waited on a log nothing keeps; this one does not.
    expect(oldestUntouched(rowsAt())?.to).toBe('/research/backtest')
  })

  it('ignores a row whose rows have all left', () => {
    const rows = rowsAt(new Map([['/research/backtest', 43]]))
    expect(oldestUntouched(rows)?.to).not.toBe('/research/backtest')
  })

  it('answers null when nothing carries an age', () => {
    expect(oldestUntouched(censusRows(NO_READINGS, NO_ORIGINS))).toBeNull()
  })
})
