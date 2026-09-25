import { describe, expect, it } from 'vitest'
import { fmtAge, freshReading, inRTH, snapshotStale, tradingCalendar } from './freshness'

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
