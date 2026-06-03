import { describe, it, expect } from 'vitest'
import { buildCalendarGrid, WEEKDAY_LABELS } from './performanceCalendarModel'

describe('performanceCalendarModel', () => {
  it('uses Sun-first weekday labels (Legacy US calendar)', () => {
    expect(WEEKDAY_LABELS).toEqual(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'])
  })

  it('buildCalendarGrid pads with Sun column when month starts on Monday', () => {
    const grid = buildCalendarGrid('2026-06', new Map())
    const firstWeek = grid[0]!.days
    expect(firstWeek[0]).toBeNull()
    expect(firstWeek[1]?.dayNum).toBe(1)
    expect(firstWeek[1]?.date).toBe('2026-06-01')
  })
})
