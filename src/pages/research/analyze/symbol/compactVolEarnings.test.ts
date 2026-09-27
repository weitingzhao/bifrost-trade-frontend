import { describe, expect, it } from 'vitest'
import type { ExpectedEarnings } from '@/api/research/narrative'
import { volFoldEarnings } from './compactVolEarnings'

const sessions = ['2026-07-30', '2026-07-31', '2026-08-03', '2026-08-04', '2026-08-05']

function est(date: string, daysAway: number): ExpectedEarnings {
  return {
    date,
    basis: 'same quarter last year + 364d',
    from: '2025-11-03',
    days_away: daysAway,
    track: { n: 4, median_miss_days: 0, max_miss_days: 0 },
  }
}

// A term that kinks after day 37: 30% before, 40% after.
const term = [
  { expiry: '2026-10-30', dte: 34, iv: 0.3 },
  { expiry: '2026-11-06', dte: 41, iv: 0.4 },
  { expiry: '2026-11-20', dte: 55, iv: 0.38 },
]

describe('volFoldEarnings', () => {
  it('says the rank path key and the term mark for a print ahead', () => {
    const out = volFoldEarnings({ sessions, filings: ['2026-08-03'], next: est('2026-11-02', 37), term })
    expect(out.iv_rank?.text).toBe('Earnings on the 60d path: 3 Aug · next ~2 Nov · 37d (est.)')
    expect(out.iv_rank?.title).toContain('Next earnings estimated 2026-11-02')
    expect(out.term_slope?.text).toMatch(
      /^Next earnings ~2 Nov \(37d, est\.\) — 11-06 is the first expiry after it and carries the event premium · ±\d+\.\d% priced\.$/
    )
    expect(out.term_slope?.late).toBe(false)
  })

  it('names no print on the path but still the next one', () => {
    const out = volFoldEarnings({ sessions, filings: ['2026-05-04'], next: est('2026-11-02', 37), term })
    expect(out.iv_rank?.text).toBe('Earnings on the 60d path: none · next ~2 Nov · 37d (est.)')
  })

  it('reads beyond the event window as no earnings inside it', () => {
    const out = volFoldEarnings({ sessions, filings: [], next: est('2026-11-20', 55), term })
    expect(out.term_slope?.text).toBe('No earnings inside 45 days — the next is ~20 Nov (55d, est.).')
  })

  it('says a late print in both sections, with the late lead on hover', () => {
    const out = volFoldEarnings({ sessions, filings: [], next: est('2026-08-04', -3), term })
    expect(out.iv_rank?.text).toBe('Earnings on the 60d path: none · expected ~4 Aug — late')
    expect(out.iv_rank?.late).toBe(true)
    expect(out.term_slope?.text).toMatch(/^Earnings late — expected ~4 Aug, no results 8-K yet\./)
    expect(out.term_slope?.title).toMatch(/^Earnings late: expected ~4 Aug/)
  })

  it('carries nothing without an estimate or a print, and no path line before the vrp year loads', () => {
    expect(volFoldEarnings({ sessions, filings: [], next: null, term })).toEqual({})
    expect(volFoldEarnings({ sessions: [], filings: ['2026-08-03'], next: est('2026-11-02', 37), term }).iv_rank).toBeUndefined()
  })
})
