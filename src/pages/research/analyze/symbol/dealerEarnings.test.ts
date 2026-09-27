import { describe, expect, it } from 'vitest'
import type { ExpectedEarnings } from '@/api/research/narrative'
import type { EventMove } from '@/utils/earningsEstimate'
import { cyclePrints, opexEarnings } from './dealerEarnings'

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

describe('cyclePrints', () => {
  it('puts a print in the cycle it fell inside, the oldest measured from the monthly before it', () => {
    const m = cyclePrints(['2026-09-18', '2026-08-21', null], ['2026-08-03', '2026-08-27'])
    // 08-21's cycle runs from 07-17 (the July monthly): 08-03 is inside.
    expect(m.get('2026-08-21')).toEqual(['2026-08-03'])
    expect(m.get('2026-09-18')).toEqual(['2026-08-27'])
  })

  it('counts a print on the OpEx day in that cycle and leaves cycles without one out', () => {
    const m = cyclePrints(['2026-08-21', '2026-09-18'], ['2026-09-18'])
    expect(m.get('2026-09-18')).toEqual(['2026-09-18'])
    expect(m.has('2026-08-21')).toBe(false)
  })

  it('folds an amendment into its release', () => {
    const m = cyclePrints(['2026-08-21'], ['2026-08-03', '2026-08-05'])
    expect(m.get('2026-08-21')).toEqual(['2026-08-03'])
  })

  it('reaches back across a year end for the oldest cycle', () => {
    const m = cyclePrints(['2026-01-16'], ['2025-12-20'])
    expect(m.get('2026-01-16')).toEqual(['2025-12-20'])
  })
})

describe('opexEarnings', () => {
  it('warns when the print lands before the pin expiry, with the priced move against the pin distance', () => {
    const r = opexEarnings({ next: est('2026-10-21', 25), expiry: '2026-10-23', gap, pinDist: 0.013 })
    expect(r?.tag).toMatchObject({ label: 'E ~21 Oct · before expiry', tone: 'warning' })
    expect(r?.note).toBe(
      "Earnings ~21 Oct (25d, est.) land before the 10-23 expiry — the ATM term prices ±4.2% for it, against 1.3% from spot to the pin strike. The pin is read off today's open interest; the print moves spot off it and the open interest is rebuilt after it."
    )
  })

  it('counts the expiry day itself as inside the cycle', () => {
    const r = opexEarnings({ next: est('2026-10-23', 27), expiry: '2026-10-23' })
    expect(r?.tag.tone).toBe('warning')
    expect(r?.note).toMatch(/^Earnings ~23 Oct \(27d, est\.\) land on the 10-23 expiry\. The pin/)
  })

  it('tags a print after the expiry quietly and raises no warning', () => {
    const r = opexEarnings({ next: est('2026-11-02', 37), expiry: '2026-10-23', gap })
    expect(r?.tag).toMatchObject({ label: 'E ~2 Nov · after expiry', tone: 'neutral' })
    expect(r?.tag.title).toContain('this cycle settles before the print')
    expect(r?.note).toBeNull()
  })

  it('warns on a late print', () => {
    const r = opexEarnings({ next: est('2026-09-22', -4), expiry: '2026-10-16' })
    expect(r?.tag).toMatchObject({ label: 'E ~22 Sep? late', tone: 'warning' })
    expect(r?.note).toMatch(/^Earnings late — expected ~22 Sep, no results 8-K yet\. Until it prints, any session before the 10-16 expiry may carry it;/)
  })

  it('speaks of the walls and zero γ for the gamma levels panel, without the pin distance', () => {
    const r = opexEarnings({ next: est('2026-10-21', 25), expiry: '2026-10-23', gap, pinDist: 0.013, about: 'levels' })
    expect(r?.tag).toMatchObject({ label: 'E ~21 Oct · before expiry', tone: 'warning' })
    expect(r?.note).toBe(
      "Earnings ~21 Oct (25d, est.) land before the 10-23 expiry — the ATM term prices ±4.2% for it. The walls and zero γ are read off today's open interest at that expiry; the print moves spot through them and the open interest is rebuilt after it."
    )
    const after = opexEarnings({ next: est('2026-11-02', 37), expiry: '2026-10-23', about: 'levels' })
    expect(after?.tag.title).toContain('these levels expire before the print')
    const late = opexEarnings({ next: est('2026-09-22', -4), expiry: '2026-10-23', about: 'levels' })
    expect(late?.note).toContain('moves spot through the walls and the open interest they are read from')
  })

  it('says nothing without an estimate', () => {
    expect(opexEarnings({ next: null, expiry: '2026-10-23' })).toBeNull()
  })
})
