/**
 * The number in each Performance calendar cell — per asset tab, per day, R and
 * U (options) or R and the flow figure (stock buckets) — from the bulk load
 * (`usePerformanceBulk`), with the summary endpoint as the fallback while the
 * bulk is absent.
 *
 * Shared because the Calendar's P&L layer quotes the same cells (§14.2: moved
 * out of `pages/portfolio/performance` when it became the second reader).
 */
import type { PerformanceDayPnLBulkResult, PerformanceResponse } from '@/types/trading'
import { fillCountOf } from '@/utils/apiCounts'

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

const SEC_TYPE_TAB: Record<string, CalendarAssetTab> = {
  OPT: 'options',
  STK: 'stocks',
  BOND: 'fixed_income',
  CASH: 'cash_like',
}

export interface DayData {
  realized: number
  unrealized: number
  fillCount: number
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
        fillCount: 0,
        notional: notionalRec[date] ?? 0,
      })
    }
  }

  for (const [date, cell] of Object.entries(options)) {
    maps.options.set(date, {
      realized: cell.realized,
      unrealized: cell.unrealized,
      fillCount: 0,
      notional: 0,
    })
  }

  return maps
}

/**
 * Fallback when the bulk load is missing: each tab reads only its own sec type
 * from `calendar_by_sec_type` (OPT rows are core's closed option pairs).
 * `perf.calendar` is every fill of every asset, so it is not a source for any tab.
 */
export function buildDayMapFromApi(
  perf: PerformanceResponse | undefined,
): Record<CalendarAssetTab, Map<string, DayData>> {
  const maps: Record<CalendarAssetTab, Map<string, DayData>> = {
    options: new Map(),
    stocks: new Map(),
    fixed_income: new Map(),
    cash_like: new Map(),
  }
  for (const e of perf?.calendar_by_sec_type ?? []) {
    if (!e.period_label) continue
    const tab = SEC_TYPE_TAB[(e.sec_type ?? '').toUpperCase()]
    if (!tab) continue
    const prev = maps[tab].get(e.period_label) ?? { realized: 0, unrealized: 0, fillCount: 0, notional: 0 }
    maps[tab].set(e.period_label, {
      realized: prev.realized + e.net_pnl,
      unrealized: 0,
      fillCount: prev.fillCount + (e.pair_count ?? fillCountOf(e)),
      notional: 0,
    })
  }
  return maps
}
