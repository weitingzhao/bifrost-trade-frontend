import { describe, expect, it } from 'vitest'
import type { ScreenerContractRow, ScreenerResponse, ScreenerSymbolGroup } from '@/types/research'
import {
  annReturnPct,
  buildScreenGroups,
  contractToken,
  DEFAULT_LIVE_FILTERS,
  deltaInBand,
  nameIv,
  nameIvLabel,
  premiumBasis,
  premiumTitle,
  quoteFromEarlierSession,
  quoteReading,
  rowPasses,
  rulesForStructure,
  screenerFunnel,
  spreadMeasured,
  TOP_PER_NAME,
} from './screenerModel'

// Invented contracts — none of these is a real quote.
function row(p: Partial<ScreenerContractRow>): ScreenerContractRow {
  return {
    strike: 100,
    right: 'P',
    dte: 30,
    expiration: '20261016',
    score: 50,
    rating: 'B',
    risk: 'medium',
    iv: 0.4,
    premium: null,
    prob_itm: 0.2,
    margin: null,
    bid: 1.47,
    ask: 1.53,
    mid: 1.5,
    spread_pct: 0.03,
    open_interest: 500,
    delta: -0.25,
    ...p,
  }
}

function group(symbol: string, contracts: ScreenerContractRow[]): ScreenerSymbolGroup {
  return { symbol, spot: 110, best_score: 60, avg_iv: 0.4, contract_count: contracts.length, contracts }
}

describe('the design formula', () => {
  it('reads annualised return as premium ÷ cash secured × 365 ÷ DTE', () => {
    // 1.50 on a 100 strike for 30 days → 1.5% × 365/30 = 18.25%
    expect(annReturnPct(row({ mid: 1.5, strike: 100, dte: 30 }))).toBeCloseTo(18.25, 2)
  })

  it('falls back to the engine premium when there is no mid, and reads nothing without either', () => {
    expect(annReturnPct(row({ mid: null, premium: 1.5 }))).toBeCloseTo(18.25, 2)
    expect(annReturnPct(row({ mid: null, premium: null }))).toBeNull()
  })

  it('writes the §14.4 contract token', () => {
    expect(contractToken('ABC', row({ expiration: '20261016', strike: 150, right: 'P' }))).toBe('ABC 16OCT26 150P')
    expect(contractToken('ABC', row({ expiration: '2026-03-25', strike: 387.5, right: 'C' }))).toBe('ABC 25MAR26 387.5C')
  })

  it('lights Δ only inside the structure band', () => {
    expect(deltaInBand(-0.25)).toBe(true)
    expect(deltaInBand(-0.1)).toBe(false)
    expect(deltaInBand(null)).toBe(false)
  })
})

describe('live filters', () => {
  const f = DEFAULT_LIVE_FILTERS

  it('reads every slider in its own unit — percent, days, dollars', () => {
    expect(rowPasses(row({}), f)).toBe(true)
    expect(rowPasses(row({ prob_itm: 0.31 }), f)).toBe(false) // 31% > 30%
    expect(rowPasses(row({ spread_pct: 0.07 }), f)).toBe(false) // 7% > 6%
    expect(rowPasses(row({ dte: 50 }), f)).toBe(false) // outside 14–45
    expect(rowPasses(row({ mid: 0.5 }), f)).toBe(false) // under $1.00, and under 12%
  })

  it('fails a filter whose reading is missing rather than waving it through', () => {
    expect(rowPasses(row({ prob_itm: null }), f)).toBe(false)
    expect(rowPasses(row({ spread_pct: null }), f)).toBe(false)
  })

  it('skips the spread filter for a row the store could not measure, and only that filter', () => {
    // The engine writes spread 0 and the close as mid when the chain has no bid/ask.
    const unquoted = { bid: null, ask: null, spread_pct: 0 }
    expect(spreadMeasured(row(unquoted))).toBe(false)
    expect(rowPasses(row(unquoted), { ...f, maxSpread: 1 })).toBe(true)
    expect(rowPasses(row({ ...unquoted, prob_itm: 0.31 }), f)).toBe(false)
    // A quoted row is still filtered on its spread.
    expect(spreadMeasured(row({}))).toBe(true)
    expect(rowPasses(row({ spread_pct: 0.03 }), { ...f, maxSpread: 1 })).toBe(false)
  })

  it('keeps the four best a name, best annualised return first', () => {
    const contracts = [1.2, 2.0, 1.6, 1.4, 1.8, 1.3].map((mid, i) => row({ mid, strike: 100 + i * 0 }))
    const [g] = buildScreenGroups([group('ABC', contracts)], f, 'grouped')
    expect(g.rows).toHaveLength(TOP_PER_NAME)
    expect(g.rows.map((r) => r.mid)).toEqual([2.0, 1.8, 1.6, 1.4])
  })

  it('names only the filters that cut something when none empties a name alone', () => {
    // One contract passes P(ITM) but not return, the other return but not P(ITM);
    // spread is unmeasured on both and cuts nothing.
    const unquoted = { bid: null, ask: null, spread_pct: 0 }
    const [g] = buildScreenGroups(
      [group('ABC', [row({ ...unquoted, prob_itm: 0.2, mid: 0.5 }), row({ ...unquoted, prob_itm: 0.45, mid: 3 })])],
      f,
      'grouped',
    )
    expect(g.rows).toHaveLength(0)
    expect(g.warn).toBe('nothing meets P(ITM) / return / premium together')
  })

  it('says which filter empties a name that passes nothing', () => {
    const [g] = buildScreenGroups([group('ABC', [row({ prob_itm: 0.45 })])], f, 'grouped')
    expect(g.rows).toHaveLength(0)
    expect(g.warn).toBe('no contract meets P(ITM)')
  })
})

describe('names the engine could not screen', () => {
  const failed = { XYZ: 'No snapshot data — run Market Data Plugin sync first' }

  it('stay on the table in Grouped view, carrying the engine’s own sentence', () => {
    const gs = buildScreenGroups([group('ABC', [row({})])], DEFAULT_LIVE_FILTERS, 'grouped', failed)
    expect(gs.map((g) => g.symbol)).toEqual(['ABC', 'XYZ'])
    expect(gs[1].warn).toBe('no chain — No snapshot data — run Market Data Plugin sync first')
  })

  it('leave Passing only, which shows what passes', () => {
    const gs = buildScreenGroups([group('ABC', [row({})])], DEFAULT_LIVE_FILTERS, 'flat', failed)
    expect(gs.map((g) => g.symbol)).toEqual(['ABC'])
  })
})

describe('the funnel names the stage that empties', () => {
  const base = { picked: ['ABC', 'XYZ'], sourceLabel: 'Watchlist', loading: false, f: DEFAULT_LIVE_FILTERS }

  it('says it is waiting rather than printing zeros before the engine answers', () => {
    const cells = screenerFunnel({ ...base, data: null, loading: true, groups: [] })
    expect(cells.map((c) => c.value)).toEqual(['2', '—', '—', '—'])
    expect(cells[1].note).toBe('screening…')
  })

  it('carries the engine’s sentence when no name has a chain', () => {
    const data: ScreenerResponse = {
      ok: true,
      groups: [],
      symbols_scanned: ['ABC', 'XYZ'],
      symbols_failed: ['ABC', 'XYZ'],
      warnings: { ABC: 'No snapshot data', XYZ: 'No snapshot data' },
    }
    const cells = screenerFunnel({ ...base, data, groups: [] })
    expect(cells[1]).toMatchObject({ value: '0', tone: 'dead', note: 'No snapshot data' })
    expect(cells[3]).toMatchObject({ value: '0', tone: 'dead', note: 'nothing reached the filters' })
  })
})

describe('names still being screened', () => {
  it('hold their place in Grouped view', () => {
    const gs = buildScreenGroups([group('ABC', [row({})])], DEFAULT_LIVE_FILTERS, 'grouped', {}, ['XYZ'])
    expect(gs.map((g) => [g.symbol, g.warn])).toEqual([
      ['ABC', ''],
      ['XYZ', 'screening…'],
    ])
  })

  it('never make the funnel say "pick underlyings" once names are picked', () => {
    const cells = screenerFunnel({
      picked: ['ABC'],
      sourceLabel: null,
      data: null,
      loading: false,
      f: DEFAULT_LIVE_FILTERS,
      groups: [],
    })
    expect(cells.slice(1).map((c) => c.note)).toEqual(['not screened', 'not screened', 'not screened'])
  })

  it('say how many are still out on a cell counted before they are in', () => {
    const data: ScreenerResponse = { ok: true, groups: [], symbols_scanned: ['ABC'], symbols_failed: [] }
    const cells = screenerFunnel({
      picked: ['ABC', 'XYZ'],
      sourceLabel: null,
      data,
      loading: true,
      f: DEFAULT_LIVE_FILTERS,
      groups: [],
      pending: ['XYZ'],
    })
    expect(cells[1].note).toBe('every name has a chain · 1 still screening')
  })
})

describe('the rule that fits a row', () => {
  // Invented book: one covered-call rule and one cash-secured-put rule.
  const structures = [
    { strategy_structure_id: 1, structure_type: 'covered_call_otm' },
    { strategy_structure_id: 4, structure_type: 'cash_secured_put' },
    { strategy_structure_id: 9, structure_type: null },
  ]
  const opps = [
    { strategy_opportunity_id: 1, name: 'CC book', strategy_structure_id: 1, symbols: ['ABC'] },
    { strategy_opportunity_id: 2, name: 'CSP book', strategy_structure_id: 4, symbols: ['XYZ'] },
    { strategy_opportunity_id: 3, name: 'Untyped', strategy_structure_id: 9, symbols: ['ABC'] },
    { strategy_opportunity_id: 4, name: 'No structure', strategy_structure_id: null, symbols: ['ABC'] },
  ]

  it('counts only rules for the structure being screened', () => {
    expect(rulesForStructure(opps, structures, 'cash_secured_put')?.map((o) => o.name)).toEqual(['CSP book'])
  })

  it('matches the screen\'s covered_call to the book\'s covered_call_otm', () => {
    expect(rulesForStructure(opps, structures, 'covered_call')?.map((o) => o.name)).toEqual(['CC book'])
  })

  it('answers undefined while either book is loading, not an empty list', () => {
    expect(rulesForStructure(undefined, structures, 'cash_secured_put')).toBeUndefined()
    expect(rulesForStructure(opps, undefined, 'cash_secured_put')).toBeUndefined()
  })
})

describe('quote time and premium basis', () => {
  // Invented instants. `now` is Sat 2026-09-26 21:30 ET, already the 27th in UTC.
  const now = Date.parse('2026-09-27T01:30:00Z')
  const unquoted = { bid: null, ask: null, spread_pct: null, premium_basis: 'close' as const }
  const friClose = row({ ...unquoted, strike: 90, snapshot_ts: '2026-09-25T20:00:00+00:00' })
  const friIntraday = row({ ...unquoted, strike: 95, snapshot_ts: '2026-09-25T19:30:19.62+00:00' })
  const thuClose = row({ ...unquoted, strike: 85, snapshot_ts: '2026-09-24T20:00:00+00:00' })

  it('reads the basis from the engine, else from the quote an older engine left', () => {
    expect(premiumBasis(row({ premium_basis: 'close' }))).toBe('close')
    expect(premiumBasis(row({ premium_basis: undefined, bid: null, ask: null, spread_pct: 0 }))).toBe('close')
    expect(premiumBasis(row({ premium_basis: undefined }))).toBe('mid')
  })

  it('names the newest quote with its day, and counts the earlier ones', () => {
    const q = quoteReading([friIntraday, friClose, thuClose], now)
    expect(q.newest).toBe('Fri 16:00 ET')
    expect(q.older).toBe(2)
    expect(q.olderSession).toBe(1)
    expect(q.title).toContain('1 at Fri 15:30 ET, 1 at Thu 16:00 ET')
    expect(q.title).toContain('last trade')
  })

  it('marks only a premium from an earlier session, not an earlier snapshot of the same one', () => {
    const q = quoteReading([friIntraday, friClose, thuClose], now)
    expect(quoteFromEarlierSession(thuClose, q)).toBe(true)
    expect(quoteFromEarlierSession(friIntraday, q)).toBe(false)
    expect(quoteFromEarlierSession(friClose, q)).toBe(false)
    expect(premiumTitle(thuClose, q, now)).toContain('earlier session')
    expect(premiumTitle(friIntraday, q, now)).toContain('Earlier than the table’s newest quote (Fri 16:00 ET)')
    expect(premiumTitle(friClose, q, now)).toBe('Last trade as of Fri 16:00 ET — the chain store keeps no bid/ask to take a mid from.')
  })

  it('dates a session in New York, not UTC', () => {
    // 19:30 and 21:00 ET on the same Friday; the second is already Saturday in UTC.
    const early = row({ ...unquoted, snapshot_ts: '2026-09-25T23:30:00Z' })
    const late = row({ ...unquoted, snapshot_ts: '2026-09-26T01:00:00Z' })
    const q = quoteReading([early, late], now)
    expect(q.older).toBe(1)
    expect(q.olderSession).toBe(0)
    expect(quoteFromEarlierSession(early, q)).toBe(false)
  })

  it('says so when nothing carries a time, rather than printing one', () => {
    expect(quoteReading([], now)).toMatchObject({ newest: null, older: 0, title: 'No contract is shown.' })
    const q = quoteReading([row({ snapshot_ts: undefined })], now)
    expect(q.newest).toBeNull()
    expect(q.title).toBe('The engine sent no quote time for these rows.')
    expect(premiumTitle(row({ snapshot_ts: undefined }), q, now)).toBe('Mid of bid and ask, quoted at a time the engine did not send.')
  })
})

describe('the name’s IV percentile, as the engine scored it', () => {
  // Invented readings — no real name's IV.
  const measured: Partial<ScreenerSymbolGroup> = {
    iv30: 0.463,
    iv_percentile: 12.7,
    iv_percentile_as_of: '2026-09-25',
    iv_percentile_sessions: 252,
  }
  const withIv = (p: Partial<ScreenerSymbolGroup>) => ({ ...group('ABC', [row({})]), ...p })

  it('reads nothing from an engine that sends no reading', () => {
    expect(nameIv(group('ABC', [row({})]), undefined)).toBeNull()
    const [g] = buildScreenGroups([group('ABC', [row({})])], DEFAULT_LIVE_FILTERS, 'grouped')
    expect(g.iv).toBeNull()
  })

  it('puts the one-year percentile in the design’s IV rank seat, IV30 beside it', () => {
    const iv = nameIv(withIv(measured), undefined)
    expect(iv).toEqual({ iv30: 0.463, pct: 12.7, asOf: '2026-09-25', sessions: 252, note: '' })
    const label = nameIvLabel(iv!)
    expect(label.text).toBe('IV rank 13 · IV30 46%')
    expect(label.title).toContain('IV rank: IV30 on 25SEP26 sits at or above 12.7% of its last 252 sessions')
    expect(label.warn).toBe(false)
  })

  it('says in a word why a withheld percentile is not scored, the engine’s sentence on hover', () => {
    const note = 'IV percentile unmeasured: Research withholds it on 4 sessions of IV30 history'
    const iv = nameIv(withIv({ ...measured, iv_percentile: null, iv_percentile_sessions: 4 }), note)!
    expect(iv.note).toBe(note)
    expect(nameIvLabel(iv)).toEqual({
      text: 'IV rank — (4 sessions) · IV30 46%',
      title: `${note}. Every contract scores it neutral (0.5).`,
      warn: false,
    })
  })

  it('dates a stale reading, names a missing one, and warns only on a failed read', () => {
    const stale = nameIv(
      withIv({ ...measured, iv_percentile: null, iv_percentile_as_of: '2026-09-18' }),
      "IV percentile unmeasured: Research's newest IV30 reading is 2026-09-18, 8 days old",
    )!
    expect(nameIvLabel(stale).text).toBe('IV rank — (as of 18SEP26) · IV30 46%')

    const none = nameIv(
      withIv({ iv30: null, iv_percentile: null, iv_percentile_as_of: null, iv_percentile_sessions: null }),
      'IV percentile unmeasured: Research holds no IV30 for this name',
    )!
    expect(nameIvLabel(none)).toMatchObject({ text: 'IV rank — (no IV30)', warn: false })

    const failed = nameIv(
      withIv({ iv30: null, iv_percentile: null, iv_percentile_as_of: null, iv_percentile_sessions: null }),
      'IV percentile read failed (Research /analytics/options/iv-percentile): ConnectError: refused',
    )!
    expect(nameIvLabel(failed)).toMatchObject({ text: 'IV rank — (read failed)', warn: true })
  })

  it('finds the IV note behind a spread note the engine joined to it', () => {
    const iv = nameIv(
      withIv({ ...measured, iv_percentile: null, iv_percentile_sessions: 4 }),
      'max_spread_pct not applied to 1 of 1 contracts: no bid/ask on file; IV percentile unmeasured: Research withholds it on 4 sessions of IV30 history',
    )!
    expect(iv.note).toBe('IV percentile unmeasured: Research withholds it on 4 sessions of IV30 history')
  })

  it('rides on each screened name and on no name the engine could not screen', () => {
    const gs = buildScreenGroups([withIv(measured)], DEFAULT_LIVE_FILTERS, 'grouped', { XYZ: 'No snapshot data' }, ['QRS'], {})
    expect(gs.map((g) => [g.symbol, g.iv?.pct ?? null])).toEqual([
      ['ABC', 12.7],
      ['XYZ', null],
      ['QRS', null],
    ])
  })

  it('never lends a screened name’s IV note to the Screenable cell', () => {
    const data: ScreenerResponse = {
      ok: true,
      groups: [withIv({ ...measured, iv_percentile: null })],
      symbols_scanned: ['ABC', 'XYZ'],
      symbols_failed: ['XYZ'],
      warnings: {
        ABC: 'IV percentile unmeasured: Research withholds it on 4 sessions of IV30 history',
        XYZ: 'No option contracts on file',
      },
    }
    const cells = screenerFunnel({
      picked: ['ABC', 'XYZ'],
      sourceLabel: null,
      data,
      loading: false,
      f: DEFAULT_LIVE_FILTERS,
      groups: [],
    })
    expect(cells[1].note).toBe('No option contracts on file')
  })
})
