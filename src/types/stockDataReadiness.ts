export type CheckStatus = 'ok' | 'warn' | 'error' | 'loading' | 'unknown' | 'void'

export type SepaRunStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10

export type RunbookStageId = 'baseline' | 'financials' | 'market' | 'publish'

export type SepaGapAckDataType =
  | 'income_statements'
  | 'balance_sheets'
  | 'cash_flows'
  | 'ratios'
  | 'short_interest'
  | 'short_volume'

export type FinDrawerKind = 'income' | 'balance' | 'cash' | 'ratios' | 'sint' | 'svol'

export interface SepaReadinessCatalogEntry {
  id: string
  object: string
  role: string
  typical_ingest?: string
  depends_on?: string[]
  data_points: string[]
  view_query?: string
}

export interface SepaReadinessDataCatalog {
  raw_sources: SepaReadinessCatalogEntry[]
  computed_layers: SepaReadinessCatalogEntry[]
}

export interface SepaReadinessHolidaysSummary {
  total: number
  early_close_count: number
  massive_count: number
  seed_count: number
  manual_count: number
  earliest_date: string | null
  latest_date: string | null
  last_massive_sync: string | null
  by_exchange: Array<{ exchange: string; count: number }>
}

export interface SepaSnapshotByTypeRow {
  code: string
  description: string | null
  snapshot_row_count: number
  universe_ticker_count: number
}

export interface SepaFundamentalsSymbolCountByTypeRow {
  code: string
  income_statement_symbols: number
  balance_sheet_symbols: number
  cash_flow_symbols: number
  ratio_symbols: number
}

export interface SepaReadinessNotesRow {
  notes: string
  count: number
}

export interface SepaReadinessSummaryResponse {
  ok: boolean
  error?: string
  data_catalog?: SepaReadinessDataCatalog
  universe_count?: number
  tickers_active_count?: number
  tickers_last_synced_at?: string | null
  price_readiness_live?: { total_symbols: number; price_ready: number }
  fund_cache_view_exists?: boolean
  fund_cache_valid_count?: number | null
  snapshot_populated?: boolean
  snapshot_today?: {
    rows_total: number
    included_in_universe: number
    price_ready: number
  }
  notes_breakdown?: SepaReadinessNotesRow[]
  holidays_summary?: SepaReadinessHolidaysSummary
  stock_unified_snapshot_row_count?: number | null
  stock_unified_snapshot_last_fetched_at?: string | null
  stock_unified_snapshot_by_type?: SepaSnapshotByTypeRow[] | null
  fundamentals_symbol_count_by_type?: SepaFundamentalsSymbolCountByTypeRow[] | null
  stock_day_vendor_fill_gap_count?: number | null
  income_statements_gap_count?: number | null
  balance_sheets_gap_count?: number | null
  cash_flows_gap_count?: number | null
  ratios_gap_count?: number | null
  short_interest_gap_count?: number | null
  short_volume_gap_count?: number | null
  income_statements_source_void?: boolean
  balance_sheets_source_void?: boolean
  cash_flows_source_void?: boolean
  ratios_source_void?: boolean
  short_interest_source_void?: boolean
  short_volume_source_void?: boolean
  income_statements_acked_gap_count?: number | null
  balance_sheets_acked_gap_count?: number | null
  cash_flows_acked_gap_count?: number | null
  ratios_acked_gap_count?: number | null
  short_interest_acked_gap_count?: number | null
  short_volume_acked_gap_count?: number | null
  income_statements_actionable_gap_count?: number | null
  balance_sheets_actionable_gap_count?: number | null
  cash_flows_actionable_gap_count?: number | null
  ratios_actionable_gap_count?: number | null
  short_interest_actionable_gap_count?: number | null
  short_volume_actionable_gap_count?: number | null
}

export interface SepaPriceGapItem {
  symbol: string
  bar_rows: number
  first_bar_date: string | null
  last_bar_date: string | null
  null_close_rows: number
  null_volume_rows: number
  vendor_day?: string | null
  last_bar_max_date?: string | null
  last_stock_day_close?: number | null
  session_close?: number | null
  reason: string
}

export interface SepaFinGapRow {
  symbol: string
  quarterly_rows?: number | null
  annual_rows?: number | null
  quarterly_max_period_end?: string | null
  annual_max_period_end?: string | null
  gap_reason?: string | null
}

export interface RunbookStepView {
  id: SepaRunStep
  title: string
  short: string
  status: CheckStatus
  done: boolean
  metric: string
}

export interface RunbookStageView {
  id: RunbookStageId
  title: string
  blurb: string
  stepIds: readonly SepaRunStep[]
  steps: RunbookStepView[]
  stageStatus: CheckStatus
  doneCount: number
  stageDone: boolean
  containsActive: boolean
}
