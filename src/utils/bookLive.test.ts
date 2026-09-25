/**
 * Book Live's row rules. Fixtures are invented — no DEV figures.
 */
import { describe, expect, it } from 'vitest'
import type { VendorGreeksRow } from '@/api/marketData/optionGreeks'
import { bookLiveTotals, buildBookLiveRows, etDate, type BookLiveInputs } from './bookLive'

const TODAY = '2031-03-12'

function vendor(ticker: string, over: Partial<VendorGreeksRow> = {}): VendorGreeksRow {
  return {
    option_ticker: ticker,
    underlying: 'ZZZ',
    snapshot_ts: '2031-03-11T20:15:00Z',
    iv: 0.4,
    delta: -0.3,
    gamma: 0.01,
    theta: -0.05,
    vega: 0.1,
    open_interest: 100,
    day_close: 2.0,
    ...over,
  }
}

const SHORT_PUT = 'O:ZZZ310321P00050000'
const LONG_CALL = 'O:ZZZ310321C00060000'

function inputs(over: Partial<BookLiveInputs> = {}): BookLiveInputs {
  return {
    accounts: [
      {
        account_id: 'U0000001',
        positions: [
          { symbol: 'ZZZ', secType: 'STK', position: 10, avgCost: 50 },
          { symbol: 'ZZZ', secType: 'OPT', position: -2, avgCost: 250, contract_key: 'ZZZ|OPT|20310321|50.0|P' },
          { symbol: 'ZZZ', secType: 'OPT', position: 1, avgCost: 100, contract_key: 'ZZZ|OPT|20310321|60.0|C' },
        ],
      },
    ],
    spotOf: (sym) => (sym === 'ZZZ' ? { price: 52, source: 'live', asOf: null } : null),
    optQuotes: {
      'ZZZ|OPT|20310321|50.0|P': { last: null, bid: 1.4, ask: 1.6 },
      'ZZZ|OPT|20310321|60.0|C': { last: null, bid: 0.9, ask: 1.1 },
    },
    benchmarks: { ZZZ: { bar_time: null, close: 50, prev_close: 49, is_today: false, is_stale: false } },
    vendorByTicker: new Map([
      [SHORT_PUT, vendor(SHORT_PUT)],
      [LONG_CALL, vendor(LONG_CALL, { delta: 0.25, day_close: 0.8 })],
    ]),
    shortLegs: [{ account_id: 'U0000001', symbol: 'ZZZ', strike: 50, right: 'P', qty: -2, contract_key: 'ZZZ|OPT|20310321|50.0|P', spot: 52 }],
    tightPct: 0.05,
    todayEt: TODAY,
    tagOf: () => 'HOST',
    ...over,
  }
}

describe('buildBookLiveRows', () => {
  it('prices a stock day off the prior close and holds its delta as shares', () => {
    const stk = buildBookLiveRows(inputs()).find((r) => r.kind === 'stk')!
    // Not today's bar, so the base is the latest close: (52 − 50) × 10.
    expect(stk.dayUsd).toBe(20)
    expect(stk.dayPct).toBeCloseTo(4, 6)
    expect(stk.pnl).toBe(20)
    expect(stk.deltaEff).toBe(10)
    expect(stk.next.text).toBe('—')
  })

  it("prices an option day as live mid against the vendor's prior-session close", () => {
    const put = buildBookLiveRows(inputs()).find((r) => r.label.includes('PUT'))!
    expect(put.mark).toBeCloseTo(1.5, 6)
    expect(put.dayPts).toBeCloseTo(-0.5, 6)
    // −0.5 × −2 contracts × 100: a short put that fell made money.
    expect(put.dayUsd).toBeCloseTo(100, 6)
    expect(put.deltaEff).toBeCloseTo(60, 6)
  })

  it("refuses a close stamped today — that is today's running close, not yesterday's", () => {
    const x = inputs({ vendorByTicker: new Map([[SHORT_PUT, vendor(SHORT_PUT, { snapshot_ts: '2031-03-12T15:00:00Z' })]]) })
    const put = buildBookLiveRows(x).find((r) => r.label.includes('PUT'))!
    expect(put.dayUsd).toBeNull()
    expect(put.dayWhy).toMatch(/prior-session close/)
  })

  it('after hours, marks an option at its dated close and says so — but prints no day', () => {
    const x = inputs({ optQuotes: {} })
    const put = buildBookLiveRows(x).find((r) => r.label.includes('PUT'))!
    expect(put.mark).toBe(2)
    expect(put.markNote).toBe('vendor close · 2031-03-11')
    expect(put.dayUsd).toBeNull()
    expect(put.dayWhy).toMatch(/regular hours/)
  })

  it('dates a close by its session day, not by New York midnight', () => {
    const x = inputs({ spotOf: () => ({ price: 52, source: 'close', asOf: Date.UTC(2031, 2, 11) / 1000 }) })
    const stk = buildBookLiveRows(x).find((r) => r.kind === 'stk')!
    expect(stk.markNote).toBe('close · 2031-03-11')
  })

  it("never prices a stock off a stale broker mark it was not handed", () => {
    const x = inputs({ spotOf: () => null })
    const stk = buildBookLiveRows(x).find((r) => r.kind === 'stk')!
    expect(stk.mark).toBeNull()
    expect(stk.dayUsd).toBeNull()
    expect(stk.dayWhy).toMatch(/no quote and no dated close/)
  })

  it('flags a short leg inside the warning line and gives a long leg its θ', () => {
    const rows = buildBookLiveRows(inputs())
    const put = rows.find((r) => r.label.includes('PUT'))!
    // (52 − 50) / 50 = 4.0%, inside a 5% line.
    expect(put.next.text).toBe('4.0% to strike · 9d')
    expect(put.next.warn).toBe(true)
    const call = rows.find((r) => r.label.includes('CALL'))!
    expect(call.next.text).toBe('θ −$5/d · 9d')
    expect(call.next.warn).toBe(false)
  })

  it('totals the rows it can price and counts the rest', () => {
    const t = bookLiveTotals(buildBookLiveRows(inputs({ optQuotes: {} })))
    expect(t.dayUsd).toBe(20)
    expect(t.dayUnknown).toBe(2)
    expect(t.warnCount).toBe(1)
  })
})

describe('etDate', () => {
  it('reads the New York calendar day, not UTC', () => {
    expect(etDate('2031-03-12T02:30:00Z')).toBe('2031-03-11')
    expect(etDate(null)).toBeNull()
  })
})
