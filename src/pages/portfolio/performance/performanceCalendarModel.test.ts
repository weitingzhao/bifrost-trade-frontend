import { describe, it, expect } from 'vitest'
import type { PerformanceResponse } from '@/types/trading'
import { buildCalendarGrid, buildDayMapFromApi, WEEKDAY_LABELS } from './performanceCalendarModel'

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

  it('buildDayMapFromApi gives each tab only its own sec type, not the all-asset calendar', () => {
    // One day: a stock sale realizes 40, an option pair closes for 25.
    // `calendar` is every fill (stock + option legs); the OPT row is the closed pair.
    const day = { period_start_ts: 0, period_label: '2026-03-04' }
    const perf = {
      summary: {},
      calendar: [{ ...day, pnl: 66, commission: 1, net_pnl: 65, fill_count: 3 }],
      calendar_by_sec_type: [
        { ...day, sec_type: 'STK', pnl: 40.5, commission: 0.5, net_pnl: 40, fill_count: 1 },
        { ...day, sec_type: 'OPT', pnl: 25.5, commission: 0.5, net_pnl: 25, pair_count: 1 },
      ],
    } as unknown as PerformanceResponse

    const maps = buildDayMapFromApi(perf)
    expect(maps.options.get('2026-03-04')).toMatchObject({ realized: 25, fillCount: 1 })
    expect(maps.stocks.get('2026-03-04')).toMatchObject({ realized: 40, fillCount: 1 })
  })

  it('buildDayMapFromApi leaves the options tab empty on a stock-only day', () => {
    const day = { period_start_ts: 0, period_label: '2026-03-05' }
    const perf = {
      summary: {},
      calendar: [{ ...day, pnl: 12, commission: 0, net_pnl: 12, fill_count: 1 }],
      calendar_by_sec_type: [{ ...day, sec_type: 'STK', pnl: 12, commission: 0, net_pnl: 12, fill_count: 1 }],
    } as unknown as PerformanceResponse

    const maps = buildDayMapFromApi(perf)
    expect(maps.options.has('2026-03-05')).toBe(false)
    expect(maps.stocks.get('2026-03-05')?.realized).toBe(12)
  })
})
