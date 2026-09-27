import { describe, expect, it } from 'vitest'
import type { ExpectedEarnings } from '@/api/research/narrative'
import type { EventMove } from '@/utils/earningsEstimate'
import { addWeekdays, forecastPrints, horizonEarnings } from './scenarioEarnings'

function est(date: string, daysAway: number): ExpectedEarnings {
  return {
    date,
    basis: 'same quarter last year + 364d',
    from: '2025-10-22',
    days_away: daysAway,
    track: { n: 4, median_miss_days: 1, max_miss_days: 2 },
  }
}

const gap: EventMove = {
  move: 0.042,
  sigma: 0.053,
  before: { expiry: '2026-10-16', dte: 20, iv: 0.39 },
  after: { expiry: '2026-10-23', dte: 27, iv: 0.44 },
}

describe('addWeekdays', () => {
  it('skips weekends', () => {
    expect(addWeekdays('2026-09-25', 1)).toBe('2026-09-28')
    expect(addWeekdays('2026-09-25', 20)).toBe('2026-10-23')
  })
})

describe('horizonEarnings', () => {
  it('places the priced gap on the ruler when the print is inside the 20 sessions', () => {
    const r = horizonEarnings({ next: est('2026-10-21', 25), from: '2026-09-25', gap, spot: 437 })
    expect(r?.tag).toMatchObject({ label: 'E ~21 Oct · inside', tone: 'warning' })
    expect(r?.gap).toEqual({ lo: 419, hi: 455, move: 0.042 })
    expect(r?.note).toBe(
      'The estimated print ~21 Oct (25d, est.) falls inside these 20 sessions — the ATM term prices ±4.2% for it, 419 / 455 from spot, marked on the ruler.'
    )
  })

  it('says inside without a gap when the term prices none', () => {
    const r = horizonEarnings({ next: est('2026-10-21', 25), from: '2026-09-25', gap: null, spot: 437 })
    expect(r?.gap).toBeNull()
    expect(r?.note).toBe('The estimated print ~21 Oct (25d, est.) falls inside these 20 sessions.')
  })

  it('tags a print past the horizon quietly', () => {
    const r = horizonEarnings({ next: est('2026-11-02', 37), from: '2026-09-25', gap, spot: 185 })
    expect(r?.tag).toMatchObject({ label: 'E ~2 Nov · after the horizon', tone: 'neutral' })
    expect(r?.tag.title).toContain('after these 20 sessions (to ~23 Oct)')
    expect(r?.note).toBeNull()
    expect(r?.gap).toBeNull()
  })

  it('warns on a late print and places no gap', () => {
    const r = horizonEarnings({ next: est('2026-09-22', -4), from: '2026-09-25', spot: 120 })
    expect(r?.tag).toMatchObject({ label: 'E ~22 Sep? late', tone: 'warning' })
    expect(r?.note).toMatch(/^Earnings late — expected ~22 Sep, no results 8-K yet\. It can land inside these 20 sessions any day/)
    expect(r?.gap).toBeNull()
  })

  it('says nothing without an estimate', () => {
    expect(horizonEarnings({ next: null, from: '2026-09-25' })).toBeNull()
  })
})

describe('forecastPrints', () => {
  const rows = [
    { trade_date: '2026-08-25', target: '2026-08-26' },
    { trade_date: '2026-08-26', target: '2026-08-27' },
    { trade_date: '2026-08-28', target: '2026-08-31' },
    { trade_date: '2026-09-24', target: null },
  ]

  it('marks the session computed on the filing day — it runs into the print', () => {
    const m = forecastPrints(rows, ['2026-08-26'])
    expect([...m.entries()]).toEqual([['2026-08-26', '2026-08-26']])
  })

  it('marks the Friday session for a weekend filing', () => {
    const m = forecastPrints(rows, ['2026-08-29'])
    expect(m.get('2026-08-28')).toBe('2026-08-29')
  })

  it('reads an unsettled session as running into the next weekday', () => {
    const m = forecastPrints(rows, ['2026-09-24'])
    expect(m.get('2026-09-24')).toBe('2026-09-24')
    expect(forecastPrints(rows, ['2026-09-25']).size).toBe(0)
  })
})
