import { describe, expect, it } from 'vitest'
import type { ExpectedEarnings } from '@/api/research/narrative'
import { rankPathEarnings } from './rankPathEarnings'

const sessions = ['2026-07-28', '2026-07-29', '2026-07-30', '2026-07-31', '2026-08-03', '2026-08-04', '2026-08-05']

function est(date: string, daysAway: number, maxMiss = 3): ExpectedEarnings {
  return {
    date,
    basis: 'same quarter last year + 364d',
    from: '2025-08-04',
    days_away: daysAway,
    track: { n: 6, median_miss_days: 1, max_miss_days: maxMiss },
  }
}

describe('rankPathEarnings', () => {
  it('lights the filing session and dates it', () => {
    const r = rankPathEarnings(sessions, ['2026-04-29', '2026-07-30'], null)
    expect(r.marks.map((m) => m?.kind ?? null)).toEqual([null, null, 'print', null, null, null, null])
    expect(r.marks[2]?.title).toBe('Earnings 30 Jul — 8-K Item 2.02 filed 2026-07-30')
    expect(r.printed).toEqual(['2026-07-30'])
    expect(r.pending).toBeNull()
  })

  it('moves a weekend filing to the next session and says so', () => {
    const r = rankPathEarnings(sessions, ['2026-08-01'], null)
    expect(r.marks[4]?.kind).toBe('print')
    expect(r.marks[4]?.title).toContain('first session 2026-08-03')
  })

  it('folds an amendment a few days later into the release', () => {
    const r = rankPathEarnings(sessions, ['2026-08-04', '2026-07-29'], null)
    expect(r.marks.filter(Boolean)).toHaveLength(1)
    expect(r.marks[1]?.kind).toBe('print')
    expect(r.printed).toEqual(['2026-07-29'])
  })

  it('leaves a filing past the last session unmarked', () => {
    const r = rankPathEarnings(sessions, ['2026-08-06'], null)
    expect(r.marks.every((m) => m == null)).toBe(true)
    expect(r.printed).toEqual([])
  })

  it('points to the next print past the right edge, with the caveat', () => {
    const r = rankPathEarnings(sessions, [], est('2026-11-02', 37))
    expect(r.pending).toMatchObject({ label: 'E ~2 Nov · 37d →', late: false })
    expect(r.pending?.title).toContain('Next earnings estimated 2026-11-02. The date is an estimate')
  })

  it('marks a late print where it was expected and names it in the key', () => {
    const r = rankPathEarnings(sessions, [], est('2026-07-31', -5))
    expect(r.marks[3]?.kind).toBe('late')
    expect(r.marks[3]?.title).toMatch(/^Earnings late: expected ~31 Jul/)
    expect(r.pending).toMatchObject({ label: 'E ~31 Jul? late', late: true })
  })

  it('still names a late print the window cannot place', () => {
    const r = rankPathEarnings(sessions, [], est('2026-08-07', -2))
    expect(r.marks.every((m) => m == null)).toBe(true)
    expect(r.pending).toMatchObject({ label: 'E ~7 Aug? late', late: true })
  })
})
