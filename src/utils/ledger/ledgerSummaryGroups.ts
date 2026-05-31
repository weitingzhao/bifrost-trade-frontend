import type { OptExecutionGroup } from '@/utils/ledger/optExecutionGroups'
import { adjustedRealizedPnlForOptGroup } from '@/utils/ledger/ledgerOptHelpers'
import type { OptionStockLinkSummary } from '@/types/trading'
import type { Execution } from '@/types/positions'
import type { MainTab } from '@/pages/portfolio/ledger/ledgerTypes'
import type { StratOppGroup, InstGroup } from '@/pages/portfolio/ledger/ledgerTypes'
import { execMonthKey } from '@/pages/portfolio/ledger/ledgerFormat'

export type OptionSummaryMonthEntry = { count: number; realizedPnl: number }
export type StockSummaryMonthEntry = { count: number; notional: number; realizedPnl: number }

function monthKeyForClosedOptGroup(g: OptExecutionGroup): string | null {
  const months = (g.trades ?? [])
    .map(t => execMonthKey(t))
    .filter(m => m !== '0000-00')
  if (months.length === 0) return null
  months.sort()
  return months[months.length - 1] ?? null
}

function realizedGroupsFromStrategy(opps: StratOppGroup[]): OptExecutionGroup[] {
  const out: OptExecutionGroup[] = []
  for (const og of opps) {
    for (const sg of og.instanceSubgroups) {
      for (const g of sg.groups) {
        if (g.status === 'realized') out.push(g)
      }
    }
  }
  return out
}

function realizedGroupsFromInstance(groups: InstGroup[]): OptExecutionGroup[] {
  const out: OptExecutionGroup[] = []
  for (const ig of groups) {
    for (const g of ig.groups) {
      if (g.status === 'realized') out.push(g)
    }
  }
  return out
}

export function closedGroupsForLedgerSummary(params: {
  activeTab: MainTab
  closedOptGroups: OptExecutionGroup[]
  filteredClosedOptGroups: OptExecutionGroup[]
  filteredStrategyOpportunityGroups: StratOppGroup[]
  filteredInstanceGroups: InstGroup[]
  noInstanceOptGroups: OptExecutionGroup[]
}): OptExecutionGroup[] {
  switch (params.activeTab) {
    case 'options':
      return params.filteredClosedOptGroups
    case 'strategy':
      return realizedGroupsFromStrategy(params.filteredStrategyOpportunityGroups)
    case 'instance':
      return [
        ...realizedGroupsFromInstance(params.filteredInstanceGroups),
        ...params.noInstanceOptGroups.filter(g => g.status === 'realized'),
      ]
    default:
      return params.closedOptGroups
  }
}

export function buildOptionsSummaryByMonth(
  groups: OptExecutionGroup[],
  linkByOptionId: Record<number, OptionStockLinkSummary>,
): [string, OptionSummaryMonthEntry][] {
  const byMonth = new Map<string, OptionSummaryMonthEntry>()
  for (const g of groups) {
    const monthStr = monthKeyForClosedOptGroup(g)
    if (!monthStr) continue
    const cur = byMonth.get(monthStr) ?? { count: 0, realizedPnl: 0 }
    cur.count += 1
    cur.realizedPnl += adjustedRealizedPnlForOptGroup(g, linkByOptionId)
    byMonth.set(monthStr, cur)
  }
  return Array.from(byMonth.entries()).sort(([a], [b]) => b.localeCompare(a))
}

export function buildStocksSummaryByMonth(execs: Execution[]): [string, StockSummaryMonthEntry][] {
  const byMonth = new Map<string, StockSummaryMonthEntry>()
  for (const e of execs) {
    const monthStr = execMonthKey(e)
    if (monthStr === '0000-00') continue
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
