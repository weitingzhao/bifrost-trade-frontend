/**
 * The two things this page must not do: sum an unpriced leg as zero, and call
 * a long leg tight.
 */
import { describe, expect, it } from 'vitest'
import { bookLegRows, byExpiry, marksStanding, type BookLegInput } from './bookGreeksModel'

const leg = (over: Partial<BookLegInput> = {}): BookLegInput => ({
  underlying: 'NVDA',
  expiry: '20261120',
  strike: 245,
  right: 'C',
  qty: -1,
  spot: 228,
  ...over,
})

/** The vendor's row is per share; the model scales it by this row's own qty. */
const greeks = {
  perShareByTicker: new Map([
    [
      'O:NVDA261120C00245000',
      {
        option_ticker: 'O:NVDA261120C00245000',
        underlying: 'NVDA',
        snapshot_ts: '2026-09-22T00:00:00Z',
        iv: 0.3668,
        delta: 0.367,
        gamma: 0.009,
        theta: -0.041,
        vega: 0.212,
        open_interest: 100,
        day_close: 7.65,
      },
    ],
  ]),
  closeByTicker: new Map([['O:NVDA261120C00245000', { close: 7.65, asOf: '2026-09-22T00:00:00Z' }]]),
}

const OPTS = { todayIso: '2026-09-22', tightPct: 0.05 }

describe('bookLegRows', () => {
  it('joins by the vendor ticker and keeps the §14.4 token', () => {
    const [r] = bookLegRows([leg()], greeks, OPTS)
    expect(r.token).toBe('NVDA 20NOV26 245C')
    expect(r).toMatchObject({ mark: 7.65, unpriced: false })
    expect(r.delta).toBeCloseTo(-36.7, 1) // 0.367 per share × −1 × 100
    expect(r.dte).toBe(59)
  })

  it('marks a leg the vendor cannot price instead of zeroing it', () => {
    // DEV 2026-09-22: AMD answers count 0 at every expiry, so both AMD legs
    // land here. A zero delta would read as a flat leg.
    const [r] = bookLegRows([leg({ underlying: 'AMD', strike: 620 })], greeks, OPTS)
    expect(r).toMatchObject({ unpriced: true, delta: null, gamma: null, mark: null })
  })

  it('measures the cushion towards trouble for both rights', () => {
    // A short call is troubled by spot above the strike; a short put below it.
    const [call] = bookLegRows([leg({ strike: 245, right: 'C', spot: 228 })], greeks, OPTS)
    const [put] = bookLegRows([leg({ strike: 175, right: 'P', spot: 228 })], greeks, OPTS)
    expect(call.cushion).toBeCloseTo(0.0746, 4)
    expect(put.cushion).toBeCloseTo(0.2325, 4)
  })

  it('calls a short leg tight on either the cushion or the clock', () => {
    const near = bookLegRows([leg({ strike: 232, spot: 228 })], greeks, OPTS)[0]
    const soon = bookLegRows([leg({ expiry: '20261010' })], greeks, OPTS)[0]
    expect(near.tight).toBe(true) // 1.8% of room
    expect(soon.tight).toBe(true) // 18 DTE
    expect(bookLegRows([leg()], greeks, OPTS)[0].tight).toBe(false)
  })

  it('never calls a long leg tight — it is an opportunity, not an obligation', () => {
    const long = bookLegRows([leg({ qty: 1, strike: 232, spot: 228 })], greeks, OPTS)[0]
    expect(long.band).toBe('tight')
    expect(long.tight).toBe(false)
  })
})

describe('byExpiry', () => {
  it('groups nearest first and puts the tightest leg at the top of each', () => {
    const rows = bookLegRows(
      [
        leg({ expiry: '20261218', strike: 300 }),
        leg({ expiry: '20261120', strike: 245 }),
        leg({ expiry: '20261120', strike: 232 }),
      ],
      greeks,
      OPTS,
    )
    const groups = byExpiry(rows)
    expect(groups.map((g) => g.label)).toEqual(['20NOV26 · 59 DTE', '18DEC26 · 87 DTE'])
    expect(groups[0].rows.map((r) => r.token)).toEqual([
      'NVDA 20NOV26 232C',
      'NVDA 20NOV26 245C',
    ])
  })
})

describe('marksStanding', () => {
  it('names the symbols the vendor could not price, not just a count', () => {
    const rows = bookLegRows([leg({ underlying: 'AMD' }), leg()], greeks, OPTS)
    const s = marksStanding({ newestAsOf: '2026-09-22T00:00:00Z', staleLegs: 0 }, rows)
    expect(s.text).toBe(
      'snapshot 22SEP26 · 1 of 2 contracts priced — AMD not in the snapshot store',
    )
    expect(s.tone).toBe('warn')
  })

  it('reads clean when everything priced on one capture', () => {
    const s = marksStanding({ newestAsOf: '2026-09-22T00:00:00Z', staleLegs: 0 }, [])
    expect(s).toMatchObject({ text: 'snapshot 22SEP26', tone: 'ok' })
  })
})

describe('netting per contract', () => {
  it('nets one contract held across instances into a single row', () => {
    // The book flattens per account × instance; RKLB 18DEC26 90C arrives
    // three times on DEV. Three rows carrying one position's greeks against
    // three different quantities is what the first pass drew.
    const rows = bookLegRows(
      [leg({ qty: -5 }), leg({ qty: -4 }), leg({ qty: 2 })],
      greeks,
      OPTS,
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].qty).toBe(-7)
    expect(rows[0].delta).toBeCloseTo(-256.9, 1) // scaled by the net, not by the last leg
  })

  it('drops a contract that nets flat, rather than drawing a zero row', () => {
    expect(bookLegRows([leg({ qty: -3 }), leg({ qty: 3 })], greeks, OPTS)).toHaveLength(0)
  })

  it('nets across right spellings, so CALL and C are one contract', () => {
    const rows = bookLegRows([leg({ right: 'CALL', qty: -1 }), leg({ right: 'C', qty: -1 })], greeks, OPTS)
    expect(rows).toHaveLength(1)
    expect(rows[0].token).toBe('NVDA 20NOV26 245C')
  })
})
