import { describe, expect, it } from 'vitest'
import type { ExpectedEarnings } from '@/api/research/narrative'
import {
  earningsHeadMeta,
  expiryEarnings,
  firstExpiryAfter,
  shortDate,
  termEarningsLegend,
  termEarningsMark,
  termEarningsNote,
} from './symbolEarnings'

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

  it('tags nothing for a late print or no estimate', () => {
    expect(expiryEarnings(est(-2), 42)).toBeNull()
    expect(expiryEarnings(null, 42)).toBeNull()
  })

  it('reads the header meta', () => {
    expect(earningsHeadMeta(est(38))).toBe('earnings ~38d (est.)')
    expect(earningsHeadMeta(est(-2))).toBe('earnings late')
    expect(earningsHeadMeta(null)).toBeNull()
  })
})
