import type { OptExecutionGroup } from '@/utils/ledger/optExecutionGroups'
import type { Execution } from '@/types/positions'

export type OptionSummaryMonthEntry = { count: number; realizedPnl: number }
export type StockSummaryMonthEntry = { count: number; notional: number; realizedPnl: number }

/** Legacy LedgerView: execution time → UTC YYYY-MM (trade_date ignored). */
export function legacyUtcMonthKeyFromTimeSec(timeSec: number | null | undefined): string | null {
  const ts = Number(timeSec) || 0
  if (ts <= 0) return null
  return new Date(ts * 1000).toISOString().slice(0, 7)
}

/** Legacy: bucket closed group by max trade execution time (UTC month). */
function monthKeyForClosedOptGroup(g: OptExecutionGroup): string | null {
  const times = (g.trades ?? []).map(t => t.time ?? 0).filter(Boolean)
  const ts = times.length > 0 ? Math.max(...times) : 0
  return legacyUtcMonthKeyFromTimeSec(ts)
}

/**
 * Legacy LedgerView: all closed groups; month from max(time) UTC;
 * cell PnL = group.realized_pnl (premium-based, no option–stock slippage layer).
 */
export function closedGroupSummaryPnl(g: OptExecutionGroup): number {
  return Number(g.realized_pnl) || 0
}

/** Legacy: Summary always uses all closed option groups (not tab-scoped). */
export function buildOptionsSummaryByMonth(
  groups: OptExecutionGroup[],
): [string, OptionSummaryMonthEntry][] {
  const byMonth = new Map<string, OptionSummaryMonthEntry>()
  for (const g of groups) {
    const monthStr = monthKeyForClosedOptGroup(g)
    if (!monthStr) continue
    const cur = byMonth.get(monthStr) ?? { count: 0, realizedPnl: 0 }
    cur.count += 1
    cur.realizedPnl += closedGroupSummaryPnl(g)
    byMonth.set(monthStr, cur)
  }
  return Array.from(byMonth.entries()).sort(([a], [b]) => b.localeCompare(a))
}

/** Legacy LedgerView STK summary: execution time → UTC month. */
export function buildStocksSummaryByMonth(execs: Execution[]): [string, StockSummaryMonthEntry][] {
  const byMonth = new Map<string, StockSummaryMonthEntry>()
  for (const e of execs) {
    const monthStr = legacyUtcMonthKeyFromTimeSec(e.time)
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
