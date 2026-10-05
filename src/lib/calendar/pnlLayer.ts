/**
 * Calendar · P&L (past) — the number Performance prints in each calendar cell,
 * through Performance's own reader (`usePerformanceDayCells`, the bulk load).
 *
 * Day: Performance's own — options by its FIFO day (Chicago day range), stock
 * buckets by the broker's trade date — so a Calendar day reads exactly what
 * Performance's grid reads for it. Not re-dated to New York.
 *
 * Per tab, as Performance keeps them: R (realized) on every tab, U (the day's
 * unmatched option premium, a path figure) on options only. Performance never
 * adds R and U; `realized` here is R summed across the four tabs, and U is
 * carried beside it, not folded in.
 */
import { useMemo } from 'react'
import { usePerformanceDayCells } from '@/hooks/usePerformanceDayCells'
import { CALENDAR_ASSET_TABS, type CalendarAssetTab, type DayData } from '@/utils/ledger/performanceDayCells'
import type { CalendarLayerReading } from './calendarLayers'

export interface CalendarPnlDay {
  d: string
  /** R across options, stocks, fixed income and cash-like. */
  realized: number
  /** Options U — the day's unmatched premium; never added to R. */
  optionsUnrealized: number
  byTab: Record<CalendarAssetTab, DayData | null>
}

/** Days with any figure on any tab, oldest first — an empty cell is no fill, not a flat day. */
export function pnlDays(dayMapByTab: Record<CalendarAssetTab, Map<string, DayData>>): CalendarPnlDay[] {
  const dates = new Set<string>()
  for (const t of CALENDAR_ASSET_TABS) for (const [d, cell] of dayMapByTab[t.id]) {
    if (Math.abs(cell.realized) >= 0.005 || Math.abs(cell.unrealized) >= 0.005) dates.add(d)
  }
  return [...dates].sort().map((d) => {
    const byTab = Object.fromEntries(
      CALENDAR_ASSET_TABS.map((t) => [t.id, dayMapByTab[t.id].get(d) ?? null]),
    ) as Record<CalendarAssetTab, DayData | null>
    return {
      d,
      realized: CALENDAR_ASSET_TABS.reduce((sum, t) => sum + (byTab[t.id]?.realized ?? 0), 0),
      optionsUnrealized: byTab.options?.unrealized ?? 0,
      byTab,
    }
  })
}

/** One month (`YYYY-MM`) — the bulk load is month-scoped, as Performance's grid is. */
export function useCalendarPnl(month: string): CalendarLayerReading<CalendarPnlDay> {
  const { query, dayMapByTab } = usePerformanceDayCells({
    timeRange: 'month',
    calendarMonth: month,
    strategyOpportunityId: null,
    tradeId: null,
  })
  const items = useMemo(() => (query.data ? pnlDays(dayMapByTab) : []), [query.data, dayMapByTab])
  return {
    layer: 'pnl',
    items,
    state: query.isError && !query.data ? 'failed' : query.isPending ? 'loading' : 'ready',
    note: query.isError && !query.data ? 'Performance’s bulk load failed — no day was read, not a flat month.' : null,
  }
}
