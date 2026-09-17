import type { Execution } from '@/types/positions'
import type { MainTab } from '@/pages/portfolio/ledger/ledgerTypes'
import {
  executionMatchesExpiryYearMonth,
  executionMatchesLedgerTradePeriod,
  ledgerExecutionDateKey,
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
  /**
   * One trade date, `YYYY-MM-DD` (`?date=` from Performance's day records). It
   * replaces the Since window; an undated row is not that day's fill.
   */
  tradeDay?: string | null
}

/** A `?date=` value the ledger will filter by, or null when it is not a calendar date. */
export function parseLedgerTradeDay(raw: string | null | undefined): string | null {
  const s = String(raw ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const d = new Date(`${s}T12:00:00Z`)
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s ? null : s
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
  if (args.tradeDay) return ledgerExecutionDateKey(e.trade_date) === args.tradeDay
  if (!shouldApplySinceTradeFilter(args.sincePreset, args.expiryFilterYear)) return true
  return executionMatchesLedgerTradePeriod(e.trade_date ?? null, args.dateRange)
}
