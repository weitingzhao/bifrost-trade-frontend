import { describe, expect, it } from 'vitest'
import type { EarningsDates } from '@/api/research/narrative'
import { earningsLabel, readEarnings, spansEarnings } from './screenerEarnings'

// Invented readings — no real name's calendar.
function dates(p: Partial<EarningsDates>): EarningsDates {
  return { symbol: 'ABC', dates: ['2025-10-20'], filings: 8, first_filed: null, last_filed: null, ...p }
}
const expected = (days_away: number) =>
  readEarnings(
    dates({
      expected_next: {
        date: '2026-10-20',
        basis: 'same quarter + 52w',
        from: '2025-10-21',
        days_away,
        track: { n: 4, median_miss_days: 1, max_miss_days: 2 },
      },
    }),
  )

describe('reading the next print', () => {
  it('takes the expected print when the store has one', () => {
    expect(expected(24)).toMatchObject({ kind: 'expected', next: { daysAway: 24, date: '2026-10-20' } })
  })

  it('tells a name the feed never carried from one with no cadence', () => {
    expect(readEarnings(dates({ filings: 0, expected_next: null }))).toMatchObject({ kind: 'none', reason: expect.stringContaining('no 8-K') })
    expect(readEarnings(dates({ expected_next: null }))).toMatchObject({ kind: 'none', reason: expect.stringContaining('cadence') })
  })
})

describe('the prototype rule — a contract spans earnings when the print is on or before expiry', () => {
  it('spans from the print day on', () => {
    expect(spansEarnings(23, expected(24))).toBe(false)
    expect(spansEarnings(24, expected(24))).toBe(true)
    expect(spansEarnings(40, expected(24))).toBe(true)
  })

  it('spans every contract when the print is late, and none when there is no date', () => {
    expect(spansEarnings(7, expected(-3))).toBe(true)
    expect(spansEarnings(40, readEarnings(dates({ expected_next: null })))).toBe(false)
    expect(spansEarnings(40, undefined)).toBe(false)
  })
})

describe('the group row label', () => {
  it('prints days, and says the date is an estimate with its record', () => {
    const l = earningsLabel(expected(24))
    expect(l.text).toBe('earnings 24d')
    expect(l.title).toContain('2026-10-20')
    expect(l.title).toContain('within 2 days on 4 of 4 prints')
  })

  it('flags a print overdue beyond the rule record, and not one inside it', () => {
    // The invented track's max miss is 2 days.
    const late3 = earningsLabel(expected(-3))
    expect(late3).toMatchObject({ text: 'earnings late 3d', warn: true })
    expect(late3.title).toContain('the filings feed has not carried it')
    expect(late3.title).toContain('since 2025-10-20')
    expect(earningsLabel(expected(-2))).toMatchObject({ text: 'earnings late 2d', warn: false })
  })

  it('prints late, a dash with the reason, or a reading in progress', () => {
    expect(earningsLabel(expected(-3)).text).toBe('earnings late 3d')
    expect(earningsLabel(readEarnings(dates({ filings: 0, expected_next: null })))).toMatchObject({ text: 'earnings —' })
    expect(earningsLabel(undefined).text).toBe('earnings …')
  })
})
