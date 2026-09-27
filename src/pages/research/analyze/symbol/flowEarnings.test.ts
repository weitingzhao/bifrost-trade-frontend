import { describe, expect, it } from 'vitest'
import type { ExpectedEarnings } from '@/api/research/narrative'
import { pcrYearEarnings } from './flowEarnings'

function est(date: string, daysAway: number): ExpectedEarnings {
  return {
    date,
    basis: 'same quarter last year + 364d',
    from: '2025-11-03',
    days_away: daysAway,
    track: { n: 4, median_miss_days: 0, max_miss_days: 0 },
  }
}

describe('pcrYearEarnings', () => {
  it('keeps the prints inside the year, folded, and names the next one', () => {
    const r = pcrYearEarnings('2025-11-10', '2026-09-25', ['2025-11-03', '2026-02-02', '2026-02-04', '2026-05-04', '2026-08-03'], est('2026-11-02', 37))
    expect(r.prints).toEqual(['2026-02-02', '2026-05-04', '2026-08-03'])
    expect(r.late).toBeNull()
    expect(r.pending).toMatchObject({ label: 'E ~2 Nov · 37d →', late: false })
  })

  it('places a late print inside the year and still names it', () => {
    const r = pcrYearEarnings('2025-10-01', '2026-09-25', [], est('2026-09-22', -4))
    expect(r.late).toBe('2026-09-22')
    expect(r.pending).toMatchObject({ label: 'E ~22 Sep? late', late: true })
  })

  it('leaves a late print the year does not reach to the key alone', () => {
    const r = pcrYearEarnings('2025-10-01', '2026-09-18', [], est('2026-09-22', -4))
    expect(r.late).toBeNull()
    expect(r.pending?.late).toBe(true)
  })

  it('carries nothing without filings or an estimate', () => {
    expect(pcrYearEarnings('2025-10-01', '2026-09-25', [], null)).toEqual({ prints: [], late: null, pending: null })
  })
})
