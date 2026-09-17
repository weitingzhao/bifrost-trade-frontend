import type { OptExecutionGroup } from '@/utils/ledger/optExecutionGroups'
import type { Execution } from '@/types/positions'
import { ledgerExecutionDateKey } from '@/utils/ledger/summaryPeriod'

export type OptionSummaryMonthEntry = { count: number; realizedPnl: number }
export type StockSummaryMonthEntry = { count: number; notional: number; realizedPnl: number }

export function lastFillTradeDate(g: OptExecutionGroup): string | null {
  let last: string | null = null
  for (const t of g.trades ?? []) {
    const d = ledgerExecutionDateKey(t.trade_date)
    if (d && (last == null || d > last)) last = d
  }
  return last
}

export function monthKeyFromTradeDate(tradeDate: string | null | undefined): string | null {
  const d = ledgerExecutionDateKey(tradeDate)
  return d ? d.slice(0, 7) : null
}

export function closedGroupSummaryPnl(g: OptExecutionGroup): number {
  return Number(g.realized_pnl) || 0
}

/**
 * Bucket closed groups by the last fill's `trade_date` month.
 *
 * A group with any undated fill falls into no month and is counted in Total /
 * undated. Its close cannot be dated: on DEV the undated rows are journal
 * closes, and bucketing by the latest dated fill filed each one's P&L under the
 * month it was *opened* — while the page said undated rows fall into no month.
 */
export function buildOptionsSummaryByMonth(
  groups: OptExecutionGroup[],
): [string, OptionSummaryMonthEntry][] {
  const byMonth = new Map<string, OptionSummaryMonthEntry>()
  for (const g of groups) {
    if ((g.trades ?? []).some(t => !ledgerExecutionDateKey(t.trade_date))) continue
    const d = lastFillTradeDate(g)
    if (!d) continue
    const monthStr = d.slice(0, 7)
    const cur = byMonth.get(monthStr) ?? { count: 0, realizedPnl: 0 }
    cur.count += 1
    cur.realizedPnl += closedGroupSummaryPnl(g)
    byMonth.set(monthStr, cur)
  }
  return Array.from(byMonth.entries()).sort(([a], [b]) => b.localeCompare(a))
}

/** Stock summary by `trade_date` month. Undated fills are omitted from month cells. */
export function buildStocksSummaryByMonth(execs: Execution[]): [string, StockSummaryMonthEntry][] {
  const byMonth = new Map<string, StockSummaryMonthEntry>()
  for (const e of execs) {
    const monthStr = monthKeyFromTradeDate(e.trade_date)
    if (!monthStr) continue
    const cur = byMonth.get(monthStr) ?? { count: 0, notional: 0, realizedPnl: 0 }
    cur.count += 1
    const q = Math.abs(Number(e.quantity ?? e.qty) || 0)
    const p = Number(e.price) || 0
    cur.notional += q * p
    cur.realizedPnl += Number(e.realized_pnl) || 0
    byMonth.set(monthStr, cur)
  }
  return Array.from(byMonth.entries()).sort(([a], [b]) => b.localeCompare(a))
}
