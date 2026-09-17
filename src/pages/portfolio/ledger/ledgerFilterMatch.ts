import type { Execution } from '@/types/positions'
import type { MainTab } from '@/pages/portfolio/ledger/ledgerTypes'
import {
  executionMatchesExpiryYearMonth,
  executionMatchesLedgerTradePeriod,
  shouldApplySinceTradeFilter,
  type LedgerSincePreset,
} from '@/utils/ledger/summaryPeriod'
import { executionMatchesRowType, type LedgerRowType } from '@/pages/portfolio/ledger/ledgerRowType'

export function ledgerStructureFilterAppliesToTab(tab: MainTab): boolean {
  return tab === 'strategy' || tab === 'instance' || tab === 'options'
}

export type LedgerFilterMatchArgs = {
  accountFilter: string
  symbolFilter: string
  allowedOpportunityIds: Set<number> | null
  activeTab: MainTab
  expiryFilterYear: string
  expiryFilterMonth: string
  sincePreset: LedgerSincePreset
  dateRange: { start: string; end: string }
  rowType: LedgerRowType
}

export function executionPassesLedgerFilters(e: Execution, args: LedgerFilterMatchArgs): boolean {
  if (args.accountFilter !== 'all' && e.account_id !== args.accountFilter) return false
  const symbolQ = args.symbolFilter.trim()
  if (symbolQ && !e.symbol.toLowerCase().includes(symbolQ.toLowerCase())) return false
  if (args.allowedOpportunityIds !== null && ledgerStructureFilterAppliesToTab(args.activeTab)) {
    if ((e.sec_type ?? '').toUpperCase() === 'OPT') {
      const oppId = e.strategy_opportunity_id
      if (oppId == null || !args.allowedOpportunityIds.has(oppId)) return false
    }
  }
  if (!executionMatchesRowType(e, args.rowType)) return false
  const isOpt = (e.sec_type ?? '').toUpperCase() === 'OPT'
  if (isOpt && args.expiryFilterYear) {
    return executionMatchesExpiryYearMonth(e.expiry, args.expiryFilterYear, args.expiryFilterMonth)
  }
  if (!shouldApplySinceTradeFilter(args.sincePreset, args.expiryFilterYear)) return true
  return executionMatchesLedgerTradePeriod(e.trade_date ?? null, args.dateRange)
}
