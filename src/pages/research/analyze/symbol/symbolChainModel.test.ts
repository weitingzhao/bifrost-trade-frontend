import { describe, expect, it } from 'vitest'
import type { ChainContract } from '@/utils/optionChain'
import { etTodayIso } from '@/lib/freshness'
import { cardEarnings, cardExpiries, contractChecks, daysToExpiry, isMonthlyExpiry, optionWatchlistKey } from './symbolChainModel'

// Made-up expiries.
const LISTED = ['2027-01-04', '2027-01-06', '2027-01-08', '2027-01-11', '2027-01-15', '2027-02-19', '2027-03-19']

describe('the expiry cards', () => {
  it('draws the design’s set: the two nearest, then three monthlies', () => {
    expect(cardExpiries(LISTED, null)).toEqual({
      expiries: ['2027-01-04', '2027-01-06', '2027-01-15', '2027-02-19', '2027-03-19'],
      handedMissing: false,
      event: null,
    })
  })

  it('knows a monthly by its third Friday, or the Thursday a holiday moves it to', () => {
    const listed = new Set(['2027-06-11', '2027-06-17', '2027-07-16'])
    expect(isMonthlyExpiry('2027-07-16', listed)).toBe(true)
    expect(isMonthlyExpiry('2027-06-17', listed)).toBe(true)
    expect(isMonthlyExpiry('2027-06-11', listed)).toBe(false)
    // A Thursday with its Friday listed is a weekly, not the month's.
    expect(isMonthlyExpiry('2027-06-17', new Set(['2027-06-17', '2027-06-18']))).toBe(false)
  })

  it('fills with the nearest others when the store lists too few monthlies', () => {
    const weeklies = ['2027-01-04', '2027-01-06', '2027-01-08', '2027-01-11', '2027-01-13', '2027-01-15']
    expect(cardExpiries(weeklies, null).expiries).toEqual(['2027-01-04', '2027-01-06', '2027-01-08', '2027-01-11', '2027-01-15'])
  })

  it('adds a handed-over expiry that is not among the cards, rather than lighting the strike elsewhere', () => {
    expect(cardExpiries(LISTED, '2027-01-11').expiries).toEqual(['2027-01-04', '2027-01-06', '2027-01-11', '2027-01-15', '2027-02-19', '2027-03-19'])
    expect(cardExpiries(LISTED, '2027-02-19').expiries).toHaveLength(5)
  })

  it('adds the first expiry after the estimated print when the pick passes it by', () => {
    const print = { date: '2027-02-01', basis: 'b', from: '2026-02-02', days_away: 30, track: { n: 4, median_miss_days: 0, max_miss_days: 0 } }
    const withEvent = [...LISTED.slice(0, 5), '2027-02-05', '2027-02-19', '2027-03-19']
    const r = cardExpiries(withEvent, null, print)
    expect(r.event).toBe('2027-02-05')
    expect(r.expiries).toEqual(['2027-01-04', '2027-01-06', '2027-01-15', '2027-02-05', '2027-02-19', '2027-03-19'])
    // Already a card: named, not added twice; a late print names none.
    expect(cardExpiries(LISTED, null, { ...print, date: '2027-02-10' }).expiries).toHaveLength(5)
    expect(cardExpiries(LISTED, null, { ...print, date: '2027-02-10' }).event).toBe('2027-02-19')
    expect(cardExpiries(withEvent, null, { ...print, days_away: -3 }).event).toBeNull()
  })

  it("says why the event expiry's card is there, and leaves the other cards' marks alone", () => {
    const print = { date: '2027-02-01', basis: 'b', from: '2026-02-02', days_away: 30, track: { n: 4, median_miss_days: 0, max_miss_days: 0 } }
    expect(cardEarnings(print, 34, true)?.title).toMatch(/^First expiry after the estimated print \(~1 Feb\) — it carries the event premium/)
    expect(cardEarnings(print, 48, false)?.title).toBe('Earnings expected ~1 Feb (estimated) — inside this expiry')
    expect(cardEarnings(print, 10, true)).toBeNull()
  })

  it('says so when the store does not list it — and not before the list has answered', () => {
    expect(cardExpiries(LISTED, '2027-06-18').handedMissing).toBe(true)
    expect(cardExpiries(undefined, '2027-06-18').handedMissing).toBe(false)
  })
})


describe('contractChecks', () => {
  const mk = (strike: number, right: 'C' | 'P', oi: number | null, volume: number | null): ChainContract => ({
    ticker: `O:X${strike}${right}`,
    strike,
    right,
    mark: 1,
    iv: 0.4,
    delta: 0.3,
    gamma: null,
    theta: null,
    vega: null,
    oi,
    volume,
  })
  const chain = [mk(170, 'C', 100, 5), mk(175, 'C', 6823, 900), mk(180, 'C', 3000, 0), mk(175, 'P', 9000, 10)]
  const base = { dte: 21, earningsDaysAway: 37, earningsDate: '2026-11-02', snapshotTs: '2026-09-25T20:00:00+00:00', today: '2026-09-26' }

  it('ranks OI within the same side and reads volume against it', () => {
    const r = contractChecks(chain, chain[1], base)
    expect(r.oiPctile).toBe(1)
    expect(r.sameSide).toBe(3)
    expect(r.volOi).toBeCloseTo(900 / 6823, 6)
    expect(r.warnings).toEqual([])
  })

  it('names the risks a trader would want before an order', () => {
    const r = contractChecks(chain, chain[2], { ...base, dte: 2, earningsDaysAway: 1, snapshotTs: '2026-09-18T20:00:00+00:00' })
    expect(r.warnings).toEqual([
      '2 DTE — theta decays fast, and exercise or assignment is close.',
      'Earnings ~2026-11-02 fall before this expiry — the premium carries the print.',
      'No trade this session — the mark is an older print.',
      'Snapshot from 2026-09-18, 8 days old.',
    ])
    expect(contractChecks(chain, chain[0], { ...base, dte: 0 }).warnings[0]).toMatch(/^Expiration day/)
    expect(contractChecks(chain, mk(160, 'C', 40, 5), base).warnings).toEqual(['Open interest 40 — an exit may have no one on the other side.'])
  })
})

describe('optionWatchlistKey', () => {
  it('matches the Trade API contract key', () => {
    expect(optionWatchlistKey('pltr', '2026-10-16', 175, 'C')).toBe('PLTR|OPT|20261016|175.0|C')
    expect(optionWatchlistKey('PLTR', '20261016', 172.5, 'P')).toBe('PLTR|OPT|20261016|172.5|P')
  })
})

describe('DTE, counted from New York’s today', () => {
  it('takes New York’s date when UTC has already turned the day', () => {
    // 21:30 ET on Sat 2026-09-26 is 01:30 UTC on the 27th; 00:30 ET is the 27th in both.
    expect(etTodayIso(Date.parse('2026-09-27T01:30:00Z'))).toBe('2026-09-26')
    expect(etTodayIso(Date.parse('2026-09-27T04:30:00Z'))).toBe('2026-09-27')
    // 19:30 EST in December, when the offset is five hours.
    expect(etTodayIso(Date.parse('2026-12-05T00:30:00Z'))).toBe('2026-12-04')
  })

  it('counts calendar days to expiry, as the Option screen does', () => {
    // The walk’s example: a 16 Oct expiry read on the evening of Sat 26 Sep.
    expect(daysToExpiry('2026-10-16', etTodayIso(Date.parse('2026-09-27T01:30:00Z')))).toBe(20)
    expect(daysToExpiry('2026-10-16', '2026-09-26')).toBe(20)
  })

  it('reads 0 on expiration day rather than rounding up to 1', () => {
    expect(daysToExpiry('2026-10-16', '2026-10-16')).toBe(0)
    expect(daysToExpiry('2026-10-16T00:00:00', '2026-10-15')).toBe(1)
  })
})
