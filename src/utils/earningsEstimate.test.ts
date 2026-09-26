import { describe, expect, it } from 'vitest'
import type { ExpectedEarnings } from '@/api/research/narrative'
import {
  earningsGate,
  lateLead,
  earningsHeadMeta,
  earningsRow,
  eventMove,
  expiryEarnings,
  firstExpiryAfter,
  shortDate,
  termEarningsLegend,
  termEarningsMark,
  termEarningsNote,
} from './earningsEstimate'

// Invented estimate and expiries.
const est = (days_away: number, over: Partial<ExpectedEarnings> = {}): ExpectedEarnings => ({
  date: '2031-11-03',
  basis: 'same quarter last year + 52 weeks',
  from: '2030-11-04',
  days_away,
  track: { n: 4, median_miss_days: 0, max_miss_days: 2 },
  ...over,
})
const TERM = [
  { label: '10-17', dte: 21 },
  { label: '11-07', dte: 42 },
  { label: '12-19', dte: 84 },
]

describe('term-structure earnings', () => {
  it('formats the design’s short date', () => {
    expect(shortDate('2031-11-03')).toBe('3 Nov')
    expect(shortDate('2031-11-03', true)).toBe('3 Nov 31')
  })

  it('marks the estimate only when it falls inside the fitted expiries', () => {
    expect(termEarningsMark(est(38), [21, 42, 84])).toEqual({
      dte: 38,
      label: 'E ~3 Nov',
      title: 'Next earnings estimated 2031-11-03 — same quarter last year + 52 weeks (2030-11-04)',
    })
    expect(termEarningsMark(est(90), [21, 42, 84])).toBeNull()
    expect(termEarningsMark(est(-2), [21, 42, 84])).toBeNull()
    expect(termEarningsMark(null, [21])).toBeNull()
  })

  it('names the first expiry after the print', () => {
    expect(firstExpiryAfter(est(38), TERM)?.label).toBe('11-07')
    expect(firstExpiryAfter(est(-1), TERM)).toBeNull()
  })

  it('says inside the window which expiry carries the premium, and that the date is estimated', () => {
    const s = termEarningsNote(est(38), TERM, 20)
    expect(s).toContain('Earnings expected ~3 Nov (38d) — the 11-07 expiry is the first after it')
    expect(s).toContain("The date is an estimate: last year's same-quarter print (4 Nov 30) plus 52 weeks.")
    expect(s).toContain('missed its last 4 prints by a median of 0 days (at most 2)')
  })

  it('says a rule that never missed on this name landed on the day', () => {
    const s = termEarningsNote(est(38, { track: { n: 4, median_miss_days: 0, max_miss_days: 0 } }), TERM, 20)
    expect(s).toContain('it landed on the day for each of the last 4 prints.')
  })

  it('says a print outside the window is not on the front', () => {
    expect(termEarningsNote(est(60), TERM, 20)).toMatch(/^No earnings expected inside 45 days — the next is ~3 Nov \(60d\)\./)
  })

  it('says a late print is late, not marked', () => {
    expect(termEarningsNote(est(-3), TERM, 20)).toMatch(/^Earnings were expected about 3 Nov and no results 8-K has arrived/)
  })

  it('tells a name outside the feed from a name without a cadence', () => {
    expect(termEarningsNote(null, TERM, 0)).toMatch(/^No 8-K on file/)
    expect(termEarningsNote(null, TERM, 30)).toMatch(/fewer than four quarterly results 8-Ks/)
  })

  it('adds a legend entry only when the mark is drawn', () => {
    expect(termEarningsLegend(est(38), termEarningsMark(est(38), [21, 84]))).toBe('next earnings ~3 Nov (estimated)')
    expect(termEarningsLegend(est(90), null)).toBeNull()
  })

  it('tags an expiry the estimated print falls inside, as the design does', () => {
    const exact = est(38, { track: { n: 4, median_miss_days: 0, max_miss_days: 0 } })
    expect(expiryEarnings(exact, 42)).toEqual({ tag: 'E', title: 'Earnings expected ~3 Nov (estimated) — inside this expiry' })
    expect(expiryEarnings(exact, 35)).toBeNull()
    expect(expiryEarnings(exact, 38)).toBeNull()
  })

  it('marks an expiry within the estimate’s own miss as either side', () => {
    const loose = est(38, { track: { n: 4, median_miss_days: 0, max_miss_days: 7 } })
    expect(expiryEarnings(loose, 42)?.tag).toBe('E?')
    expect(expiryEarnings(loose, 42)?.title).toContain('4d before this expiry — the estimate has missed this name by up to 7d')
    expect(expiryEarnings(loose, 33)?.title).toContain('5d after this expiry')
    expect(expiryEarnings(loose, 60)?.tag).toBe('E')
    expect(expiryEarnings(loose, 21)).toBeNull()
  })

  it('marks every expiry E? for a late print, and nothing without an estimate', () => {
    expect(expiryEarnings(est(-2), 42)).toEqual({
      tag: 'E?',
      title: 'Earnings late — expected ~3 Nov, no results 8-K yet; it can land before this expiry any day, or has and the feed has not caught up',
    })
    expect(expiryEarnings(est(-2), 3)?.tag).toBe('E?')
    expect(expiryEarnings(null, 42)).toBeNull()
  })

  it('leads a late warning with its date, its lateness and the estimate’s record', () => {
    expect(lateLead(est(-4, { track: { n: 4, median_miss_days: 0, max_miss_days: 1 } }))).toBe(
      "Earnings late: expected ~3 Nov (last year's 4 Nov 30 plus 52 weeks) and no results 8-K has arrived, 4 days on. That is later than this estimate has missed this name before (at most 1 day over 4 prints)."
    )
  })

  it('reads the header meta', () => {
    expect(earningsHeadMeta(est(38))).toBe('earnings ~38d (est.)')
    expect(earningsHeadMeta(est(-2))).toBe('earnings late')
    expect(earningsHeadMeta(null)).toBeNull()
  })

  it('reads the print’s move off the two expiries around it', () => {
    // Invented term: 45% into the print, 58% on the expiry that holds it.
    const term = [
      { expiry: '2031-10-24', dte: 28, iv: 0.47 },
      { expiry: '2031-10-31', dte: 35, iv: 0.45 },
      { expiry: '2031-11-07', dte: 42, iv: 0.58 },
    ]
    const ev = eventMove(term, 38)!
    expect(ev.before.expiry).toBe('2031-10-31')
    expect(ev.after.expiry).toBe('2031-11-07')
    const sigma = Math.sqrt((0.58 ** 2 - 0.45 ** 2) * (42 / 365))
    expect(ev.sigma).toBeCloseTo(sigma, 10)
    expect(ev.move).toBeCloseTo(sigma * Math.sqrt(2 / Math.PI), 10)
    expect(ev.move).toBeCloseTo(0.099, 3)
  })

  it('reads no move without an expiry each side, or without a premium', () => {
    expect(eventMove([{ expiry: '2031-11-07', dte: 42, iv: 0.58 }], 38)).toBeNull()
    expect(eventMove([{ expiry: '2031-10-31', dte: 35, iv: 0.45 }], 38)).toBeNull()
    expect(
      eventMove(
        [
          { expiry: '2031-10-31', dte: 35, iv: 0.5 },
          { expiry: '2031-11-07', dte: 42, iv: 0.48 },
        ],
        38
      )
    ).toBeNull()
  })

  it('prints the Overview’s earnings row', () => {
    expect(earningsRow(est(38), 20)).toEqual({
      value: '~38 days · 3 Nov (est.)',
      means: "The date is an estimate: last year's same-quarter print (4 Nov 30) plus 52 weeks. On this name the rule missed its last 4 prints by a median of 0 days (at most 2).",
    })
    expect(earningsRow(est(1), 20).value).toBe('~1 day · 3 Nov (est.)')
    expect(earningsRow(est(-3), 20).value).toBe('late · expected ~3 Nov')
    expect(earningsRow(null, 0).value).toBe('no 8-K on file')
    expect(earningsRow(null, 12).value).toBe('—')
  })

  it('gates the Events card on earnings inside 10 days', () => {
    expect(earningsGate(est(6))).toEqual({
      headline: 'Earnings in ~6d (estimated) — every CSP rule refuses',
      tone: 'danger',
      lamp: 'red',
    })
    expect(earningsGate(est(10))?.lamp).toBe('red')
    expect(earningsGate(est(11))).toEqual({ headline: 'No earnings inside 10 days', tone: 'neutral', lamp: 'gray' })
    expect(earningsGate(est(-1))?.lamp).toBe('yellow')
    expect(earningsGate(null)).toBeNull()
  })
})
