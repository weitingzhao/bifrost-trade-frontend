import { describe, expect, it } from 'vitest'
import type { PerformanceDayPnLBulkResult } from '@/types/trading'
import { daysBetween } from '@/lib/isoDate'
import { buildDayStats, fmtCellMoney } from './performanceDayRecords'

// Invented figures.
const bulk = {
  calendarDayPnLByAsset: {
    options: { '2026-01-05': { realized: 100, unrealized: 40 } },
    stocks: { '2026-01-05': { realized: -10, unrealized: 0 } },
    fixed_income: {},
    cash_like: {},
  },
  byDayRangeData: { optOpenByDay: { '2026-01-05': 700 } },
  rawExecsWindow: [
    { trade_date: '2026-01-05', commission: -1.5 },
    { trade_date: '2026-01-05', commission: 0.5 },
    { trade_date: '2026-01-06', commission: 9 },
  ],
} as unknown as PerformanceDayPnLBulkResult

describe('buildDayStats', () => {
  const s = Object.fromEntries(buildDayStats(bulk, '2026-01-05').map((x) => [x.label, x]))

  it('takes Day P&L as realized across layers less that day’s commissions, unrealized left out', () => {
    expect(s['Day P&L'].raw).toBe(88)
    expect(s['Options unrealized'].value).toBe('+$40')
    expect(s['Unpaired premium'].value).toBe('+$700')
  })

  it('counts only that day’s fills', () => {
    expect(s.Trades.value).toBe('2')
    expect(s.Comm.value).toBe('−$2')
  })
})

describe('helpers', () => {
  it('counts days between dates', () => {
    expect(daysBetween('2026-07-07', '2026-09-08')).toBe(63)
  })

  it('shortens cell figures', () => {
    expect(fmtCellMoney(1102)).toBe('$1.1k')
    expect(fmtCellMoney(-513)).toBe('-$513')
    expect(fmtCellMoney(953.4)).toBe('$953')
  })
})
