import { describe, expect, it } from 'vitest'
import { etDate, etDayOf, etDaysAgoIso, etStamp, etTodayIso, fmtAge, freshReading, inRTH, snapshotStale, tradingCalendar } from './freshness'

// September is EDT (UTC−4): 14:00 ET is 18:00Z.
const THU_1400 = Date.UTC(2026, 8, 24, 18, 0, 0)
const THU_0915 = Date.UTC(2026, 8, 24, 13, 15, 0)
const THU_1830 = Date.UTC(2026, 8, 24, 22, 30, 0)
const SAT_1200 = Date.UTC(2026, 8, 26, 16, 0, 0)
const CAL = tradingCalendar([
  { holiday_date: '2026-11-26', status: 'closed' },
  { holiday_date: '2026-11-27', status: 'early-close', close_time: '2026-11-27T18:00:00Z' },
])

describe('inRTH', () => {
  it('reads weekday regular hours in New York', () => {
    expect(inRTH(THU_1400)).toBe(true)
    expect(inRTH(THU_0915)).toBe(false)
    expect(inRTH(THU_1830)).toBe(false)
    expect(inRTH(SAT_1200)).toBe(false)
  })

  it('closes on a holiday and at an early close', () => {
    // November is EST (UTC−5): 11:00 ET is 16:00Z, 14:00 ET is 19:00Z.
    expect(inRTH(Date.UTC(2026, 10, 26, 16, 0))).toBe(true)
    expect(inRTH(Date.UTC(2026, 10, 26, 16, 0), CAL)).toBe(false)
    expect(inRTH(Date.UTC(2026, 10, 27, 16, 0), CAL)).toBe(true)
    expect(inRTH(Date.UTC(2026, 10, 27, 19, 0), CAL)).toBe(false)
  })
})

describe('freshReading · snapshot', () => {
  it('reads the age, quiet, while it is fresh', () => {
    const r = freshReading('snapshot', THU_1400 - 2 * 60_000, THU_1400, { src: 'monitor accounts_fetched_at' })
    expect(r).toMatchObject({ label: 'FETCHED 2m ago', warn: false })
    expect(r.title).toContain('monitor accounts_fetched_at')
    expect(r.title).toMatch(/^Fetched \d\d:\d\d:\d\d ET/)
  })

  it('goes amber past five minutes in regular hours, and only then', () => {
    expect(freshReading('snapshot', THU_1400 - 18 * 60_000, THU_1400)).toMatchObject({ label: 'STALE 18m', warn: true })
    expect(snapshotStale(THU_1400 - 18 * 60_000, THU_1400)).toBe(true)
    // After the close the same age is not stale: the tape is simply shut.
    expect(freshReading('snapshot', THU_1830 - 18 * 60_000, THU_1830)).toMatchObject({ label: 'FETCHED 18m ago', warn: false })
    expect(snapshotStale(THU_1830 - 18 * 60_000, THU_1830)).toBe(false)
  })

  it('reads an hour-old snapshot outside regular hours as the close, not as stale', () => {
    const at = Date.UTC(2026, 8, 24, 20, 4, 0)
    expect(freshReading('snapshot', at, THU_1830)).toMatchObject({ label: 'CLOSED · 16:04', warn: false })
  })
})

describe('freshReading · stream and run', () => {
  it('judges a stream by seconds in hours, and calls it closed outside them', () => {
    expect(freshReading('stream', THU_1400 - 2_000, THU_1400)).toMatchObject({ label: 'LIVE · 2s', warn: false })
    expect(freshReading('stream', THU_1400 - 12_000, THU_1400)).toMatchObject({ label: 'STALE 12s', warn: true })
    expect(freshReading('stream', THU_1830 - 60_000, THU_1830).label).toMatch(/^CLOSED · /)
  })

  it('reads a run by its schedule: ran today, due, or late past fifteen minutes', () => {
    const ran = Date.UTC(2026, 8, 24, 11, 5)
    expect(freshReading('run', ran, THU_1400, { due: '07:05' })).toMatchObject({ label: 'RUN 07:05', warn: false })
    const yesterday = ran - 24 * 3600_000
    expect(freshReading('run', yesterday, THU_1400, { due: '07:05' })).toMatchObject({ label: 'LATE · due 07:05', warn: true })
    expect(freshReading('run', yesterday, Date.UTC(2026, 8, 24, 10, 0), { due: '07:05' })).toMatchObject({ label: 'DUE 07:05', warn: false })
  })
})

describe('fmtAge', () => {
  it('prints the largest unit that fits', () => {
    expect([fmtAge(4_000), fmtAge(120_000), fmtAge(3 * 3600_000), fmtAge(50 * 3600_000)]).toEqual(['4s', '2m', '3h', '2d'])
  })
})

describe('etStamp', () => {
  // 2031-03-11 is a Tuesday; 10:32 UTC is 06:32 EDT.
  const now = Date.parse('2031-03-11T18:00:00Z')
  it('says today, the weekday within the week, and the date beyond it', () => {
    expect(etStamp(Date.parse('2031-03-11T10:32:00Z'), now)).toBe('today 06:32 ET')
    expect(etStamp(Date.parse('2031-03-09T10:29:00Z'), now)).toBe('Sun 06:29 ET')
    expect(etStamp(Date.parse('2031-02-20T11:29:00Z'), now)).toBe('02-20 06:29 ET')
  })
})

describe('etDate', () => {
  it('puts a late-UTC instant on the ET day it belongs to', () => {
    // 2026-09-12T01:30Z is 21:30 on 11 Sep in New York — the EOD agent's own
    // slot. Bucketing it by UTC would file the whole EOD pass under tomorrow.
    expect(etDate(Date.parse('2026-09-12T01:30:00Z'))).toBe('2026-09-11')
    expect(etDate(Date.parse('2026-09-11T21:30:42Z'))).toBe('2026-09-11')
    expect(etDate(Date.parse('2026-09-11T13:30:00Z'))).toBe('2026-09-11')
  })
})

describe('etDaysAgoIso (TD-247)', () => {
  // 2026-09-12T01:30Z is 21:30 EDT on Fri 11 Sep: already the 12th in UTC.
  const EVENING = Date.parse('2026-09-12T01:30:00Z')

  it('counts back from New York\'s today, not the UTC date', () => {
    expect(etTodayIso(EVENING)).toBe('2026-09-11')
    expect(etDaysAgoIso(0, EVENING)).toBe('2026-09-11')
    expect(etDaysAgoIso(30, EVENING)).toBe('2026-08-12')
    // The UTC instant arithmetic it replaces lands a day late.
    expect(new Date(EVENING - 30 * 86_400_000).toISOString().slice(0, 10)).toBe('2026-08-13')
  })

  it('steps whole calendar days across a clock change and a year end', () => {
    // 00:30 EST Mon 9 Mar 2026, the day after spring forward.
    expect(etDaysAgoIso(1, Date.parse('2026-03-09T05:30:00Z'))).toBe('2026-03-08')
    expect(etDaysAgoIso(2, Date.parse('2026-03-09T05:30:00Z'))).toBe('2026-03-07')
    expect(etDaysAgoIso(420, Date.parse('2027-01-01T04:59:00Z'))).toBe('2025-11-06')
  })
})

describe('etDayOf', () => {
  it('files an instant after 20:00 ET on its New York day, not the UTC date', () => {
    // 2026-09-11T00:30Z is 20:30 EDT on Thu 10 Sep.
    expect(etDayOf('2026-09-11T00:30:00+00:00')).toBe('2026-09-10')
    expect(etDayOf('2026-09-11T00:30:00Z')).toBe('2026-09-10')
    // 19:59 EDT and 00:01 EDT the next day either side of the UTC midnight.
    expect(etDayOf('2026-09-10T23:59:00Z')).toBe('2026-09-10')
    expect(etDayOf('2026-09-11T04:01:00Z')).toBe('2026-09-11')
  })

  it('follows the clock change, both ways', () => {
    // Spring forward, Sun 8 Mar 2026 (EST −5 → EDT −4 at 02:00 local).
    expect(etDayOf('2026-03-08T04:30:00Z')).toBe('2026-03-07') // 23:30 EST Sat
    expect(etDayOf('2026-03-08T05:30:00Z')).toBe('2026-03-08') // 00:30 EST Sun
    expect(etDayOf('2026-03-09T03:30:00Z')).toBe('2026-03-08') // 23:30 EDT Sun
    expect(etDayOf('2026-03-09T04:30:00Z')).toBe('2026-03-09') // 00:30 EDT Mon
    // Fall back, Sun 1 Nov 2026 (EDT −4 → EST −5 at 02:00 local).
    expect(etDayOf('2026-11-01T03:30:00Z')).toBe('2026-10-31') // 23:30 EDT Sat
    expect(etDayOf('2026-11-01T04:30:00Z')).toBe('2026-11-01') // 00:30 EDT Sun
    expect(etDayOf('2026-11-02T04:30:00Z')).toBe('2026-11-01') // 23:30 EST Sun
    expect(etDayOf('2026-11-02T05:30:00Z')).toBe('2026-11-02') // 00:30 EST Mon
  })

  it('keeps a bare date as written and refuses what does not parse', () => {
    expect(etDayOf('2026-09-10')).toBe('2026-09-10')
    expect(etDayOf('not a date at all')).toBe('')
    expect(etDayOf(null)).toBe('')
    expect(etDayOf('')).toBe('')
  })
})
