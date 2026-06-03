import type { PerformanceDayPnLBulkResult, PerformanceResponse } from '@/types/trading'

export type CalendarAssetTab = 'options' | 'stocks' | 'fixed_income' | 'cash_like'

export const CALENDAR_ASSET_TABS: {
  id: CalendarAssetTab
  label: string
  /** Compact label for calendar asset tab row */
  tabLabel?: string
}[] = [
  { id: 'options', label: 'Options' },
  { id: 'stocks', label: 'Stocks' },
  { id: 'fixed_income', label: 'Fixed Income Stream', tabLabel: 'FI Stream' },
  { id: 'cash_like', label: 'Cash-like' },
]

/** US-style week: Sun on the left, Sat on the right (Legacy calendar). */
export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

const SEC_TYPE_TAB: Record<string, CalendarAssetTab> = {
  OPT: 'options',
  STK: 'stocks',
  BOND: 'fixed_income',
  CASH: 'cash_like',
}

export interface DayData {
  realized: number
  unrealized: number
  tradeCount: number
  notional: number
}

export interface CalendarWeek {
  days: (CalendarDayCell | null)[]
}

export interface CalendarDayCell {
  date: string
  dayNum: number
  realized: number
  unrealized: number
  tradeCount: number
  notional: number
}

export function buildDayMapFromBulk(
  calendarDayPnLByAsset: PerformanceDayPnLBulkResult['calendarDayPnLByAsset'],
  calendarStkNotionalByBucket: PerformanceDayPnLBulkResult['calendarStkNotionalByBucket'],
): Record<CalendarAssetTab, Map<string, DayData>> {
  const maps: Record<CalendarAssetTab, Map<string, DayData>> = {
    options: new Map(),
    stocks: new Map(),
    fixed_income: new Map(),
    cash_like: new Map(),
  }

  const { options } = calendarDayPnLByAsset
  const stkTabs = ['stocks', 'fixed_income', 'cash_like'] as const

  for (const tab of stkTabs) {
    const pnlRec = calendarDayPnLByAsset[tab]
    const notionalRec = calendarStkNotionalByBucket[tab]
    for (const [date, cell] of Object.entries(pnlRec)) {
      maps[tab].set(date, {
        realized: cell.realized,
        unrealized: cell.unrealized,
        tradeCount: 0,
        notional: notionalRec[date] ?? 0,
      })
    }
  }

  for (const [date, cell] of Object.entries(options)) {
    maps.options.set(date, {
      realized: cell.realized,
      unrealized: cell.unrealized,
      tradeCount: 0,
      notional: 0,
    })
  }

  return maps
}

export function buildDayMapFromApi(
  perf: PerformanceResponse | undefined,
): Record<CalendarAssetTab, Map<string, DayData>> {
  const maps: Record<CalendarAssetTab, Map<string, DayData>> = {
    options: new Map(),
    stocks: new Map(),
    fixed_income: new Map(),
    cash_like: new Map(),
  }
  for (const e of perf?.calendar ?? []) {
    if (e.period_label) {
      maps.options.set(e.period_label, {
        realized: e.net_pnl,
        unrealized: 0,
        tradeCount: e.trade_count,
        notional: 0,
      })
    }
  }
  for (const e of perf?.calendar_by_sec_type ?? []) {
    if (!e.period_label) continue
    const tab = SEC_TYPE_TAB[(e.sec_type ?? '').toUpperCase()]
    if (!tab) continue
    const prev = maps[tab].get(e.period_label) ?? { realized: 0, unrealized: 0, tradeCount: 0, notional: 0 }
    maps[tab].set(e.period_label, {
      realized: prev.realized + e.net_pnl,
      unrealized: 0,
      tradeCount: prev.tradeCount + e.trade_count,
      notional: 0,
    })
  }
  return maps
}

export function buildCalendarGrid(yearMonth: string, dayMap: Map<string, DayData>): CalendarWeek[] {
  const [y, m] = yearMonth.split('-').map(Number)
  const firstDay = new Date(y, m - 1, 1)
  const daysInMonth = new Date(y, m, 0).getDate()

  /** 0 = Sun … 6 = Sat (matches WEEKDAY_LABELS). */
  const startDow = firstDay.getDay()

  const weeks: CalendarWeek[] = []
  let currentWeek: (CalendarDayCell | null)[] = new Array(startDow).fill(null)

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${yearMonth}-${String(d).padStart(2, '0')}`
    const data = dayMap.get(dateStr)
    currentWeek.push({
      date: dateStr,
      dayNum: d,
      realized: data?.realized ?? 0,
      unrealized: data?.unrealized ?? 0,
      tradeCount: data?.tradeCount ?? 0,
      notional: data?.notional ?? 0,
    })
    if (currentWeek.length === 7) {
      weeks.push({ days: currentWeek })
      currentWeek = []
    }
  }

  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null)
    weeks.push({ days: currentWeek })
  }

  return weeks
}
