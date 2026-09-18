import { describe, expect, it } from 'vitest'
import { businessDaysBetween, daysBetween } from './isoDate'

describe('daysBetween', () => {
  it('counts whole days, signed', () => {
    expect(daysBetween('2026-09-17', '2026-09-25')).toBe(8)
    expect(daysBetween('2026-09-17', '2026-09-10')).toBe(-7)
    expect(daysBetween('2026-09-17', '2026-09-17')).toBe(0)
  })

  it('is null on anything that is not a date', () => {
    expect(daysBetween('2026-09-17', 'not-a-date')).toBeNull()
    expect(daysBetween(null, '2026-09-17')).toBeNull()
    expect(daysBetween('2026-09-17', undefined)).toBeNull()
  })

  it('takes a timestamp’s date half and ignores the clock', () => {
    expect(daysBetween('2026-09-17T23:59:00Z', '2026-09-18T00:01:00Z')).toBe(1)
  })

  it('crosses a DST boundary without losing the day', () => {
    // US clocks move on 2026-11-01; parsed as UTC midnight both ends, so this
    // is 2, never 1.96 rounded down.
    expect(daysBetween('2026-10-31', '2026-11-02')).toBe(2)
  })
})

describe('businessDaysBetween', () => {
  it('counts both ends and skips weekends', () => {
    expect(businessDaysBetween('2026-08-03', '2026-08-07')).toBe(5) // Mon → Fri
    expect(businessDaysBetween('2026-08-03', '2026-08-10')).toBe(6) // Mon → next Mon
    expect(businessDaysBetween('2026-08-03', '2026-08-03')).toBe(1)
  })

  it('is zero when the range is empty or unreadable', () => {
    expect(businessDaysBetween('2026-08-10', '2026-08-03')).toBe(0)
    expect(businessDaysBetween('nope', '2026-08-03')).toBe(0)
  })
})
