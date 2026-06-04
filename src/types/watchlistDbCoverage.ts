export interface WatchlistDbCoverageOptionContracts {
  has_data: boolean
  row_count: number | null
  newest_created_at: string | null
  age_seconds: number | null
  last_check_at: string | null
  last_check_age_seconds: number | null
  ticker_pct: number | null
  identity_pct: number | null
  exercise_style_pct: number | null
  shares_per_contract_pct: number | null
  optional_data_fill_avg_pct: number | null
  exercise_style_null_row_count: number
  shares_per_contract_null_row_count: number
  column_gap_count: number
  mapping_mismatch_count: number | null
  distinct_expirations: number | null
  distinct_strikes: number | null
  contracts_last_at: string | null
}

export interface WatchlistDbCoverageOptionBars {
  has_data: boolean
  row_count: number | null
  last_bar_time: string | null
  last_created_at: string | null
  ohlc_complete_pct: number | null
  volume_pct: number | null
  vwap_pct: number | null
  optional_avg_pct: number | null
  distinct_expirations: number | null
  distinct_contracts: number | null
}

export interface WatchlistDbCoverageOptionSnapshots {
  has_data: boolean
  row_count: number | null
  snapshots_last_ts: string | null
  age_seconds: number | null
  iv_pct: number | null
  full_greeks_pct: number | null
  open_interest_pct: number | null
  optional_data_fill_avg_pct: number | null
  stale_snapshot_rows: number | null
}

export interface WatchlistDbCoverageSnapshotsWithUd {
  has_data: boolean
  row_count: number | null
  last_snapshot_ts: string | null
  last_created_at: string | null
}

export interface WatchlistDbCoverageExpirationCache {
  has_data: boolean
  row_count: number | null
  last_updated_at: string | null
}

export interface WatchlistDbCoverageOiDaily {
  has_data: boolean
  row_count: number | null
  last_trade_date: string | null
  last_created_at: string | null
}

export interface WatchlistDbCoverageReportDaily {
  has_data: boolean
  row_count: number | null
  last_trade_date: string | null
  last_created_at: string | null
}

export interface WatchlistDbCoverageStockDay {
  has_data: boolean
  stock_day_last_bar: string | null
  stock_day_last_created_at: string | null
  row_count?: number | null
  ohlc_complete_pct?: number | null
  volume_pct?: number | null
  vwap_pct?: number | null
  optional_avg_pct?: number | null
  distinct_bar_dates?: number | null
}

export interface WatchlistDbCoverageStockMin {
  has_data: boolean
  row_count?: number | null
  last_bar_time?: string | null
  last_created_at?: string | null
  ohlc_complete_pct?: number | null
  volume_pct?: number | null
  vwap_pct?: number | null
  optional_avg_pct?: number | null
  distinct_periods?: number | null
}

export interface WatchlistDbCoverageTickers {
  has_data: boolean
  tickers_id?: number | null
  tickers_updated_at?: string | null
  last_updated_utc?: string | null
}

export interface WatchlistDbCoverageTickerOverview {
  has_data: boolean
  overview_updated_at?: string | null
}

export interface WatchlistDbCoverageTickerTypes {
  has_data: boolean
  dictionary_row_count?: number | null
  dictionary_last_created_at?: string | null
}

export interface WatchlistDbCoverageSymbolRow {
  symbol: string
  option_contracts: WatchlistDbCoverageOptionContracts
  option_snapshots: WatchlistDbCoverageOptionSnapshots
  report_option_atm_iv_daily: {
    has_data: boolean
    atm_iv_last_trade_date: string | null
    atm_iv_last_created_at: string | null
  }
  stock_day: WatchlistDbCoverageStockDay
  option_day?: WatchlistDbCoverageOptionBars
  option_min?: WatchlistDbCoverageOptionBars
  option_snapshots_with_underlying_day?: WatchlistDbCoverageSnapshotsWithUd
  option_expiration_cache?: WatchlistDbCoverageExpirationCache
  option_open_interest_daily?: WatchlistDbCoverageOiDaily
  report_option_max_pain_daily?: WatchlistDbCoverageReportDaily
  stock_min?: WatchlistDbCoverageStockMin
  tickers?: WatchlistDbCoverageTickers
  ticker_overview?: WatchlistDbCoverageTickerOverview
  ticker_types?: WatchlistDbCoverageTickerTypes
}

export interface DbCoverageSummaryRow {
  id: string
  table_name: string
  dataset_label: string
  domain: string
  drill_down_hash: string
  distinct_symbols: number | null
  newest_activity: string | null
  newest_trade_date?: string | null
  error?: string | null
}

export interface DbCoverageSummaryResponse {
  ok: boolean
  error?: string
  generated_at?: string
  tables?: DbCoverageSummaryRow[]
  source_scope?: string
}

export interface WatchlistDbCoverageResponse {
  ok: boolean
  error?: string
  generated_at?: string
  universe?: string
  symbols_count?: number
  symbols?: WatchlistDbCoverageSymbolRow[]
  message?: string
  source_scope?: string
}

export interface OptionContractsReferenceGapExpiryRow {
  expiry: string
  pg_count: number
  pg_count_all?: number
  pg_rows_outside_reference?: number
  massive_count: number
  gap: number
  truncated?: boolean
  real_gap?: number
  illiquid?: number
}

export interface OptionContractsReferenceGapResult {
  ok: boolean
  symbol?: string
  error?: string
  has_rows?: boolean
  message?: string
  db_row_count?: number
  distinct_expiry_total?: number
  expiries_scanned?: number
  max_expiries_used?: number
  max_pages_per_expiry_used?: number
  pg_total?: number
  massive_total?: number | null
  gap?: number | null
  coverage_pct?: number | null
  compared_at?: string
  expiries?: OptionContractsReferenceGapExpiryRow[]
  truncated?: boolean
  expiries_truncated?: boolean
}

export type OptionSnapshotsContractsGapResult = OptionContractsReferenceGapResult
export type OptionBarsContractsGapResult = OptionContractsReferenceGapResult

export interface OptionMinFillEligibilityRow {
  needs_row_fill: boolean
  needs_column_fill: boolean
  gap?: number | null
  coverage_pct?: number | null
}

export interface OptionDayFillEligibilityRow {
  needs_row_fill: boolean
  needs_column_fill: boolean
  gap?: number | null
  coverage_pct?: number | null
}

export interface BarQualityDailyRow {
  bar_day: string
  contract_count: number
  ohlc_pct: number | null
  volume_pct: number | null
  vwap_pct: number | null
}

export interface BarQualityExpiryRow {
  expiry: string
  dte: number | null
  contract_count: number
  ohlc_pct: number | null
  volume_pct: number | null
  vwap_pct: number | null
}

export interface BarQualityPeriodRow {
  period: string
  row_count: number
  last_bar_time: string | null
  ohlc_pct: number | null
  volume_pct: number | null
  vwap_pct: number | null
}

export interface BarQualityDetailResponse {
  ok: boolean
  symbol: string
  table: string
  latest_date: string | null
  daily: BarQualityDailyRow[]
  expiries: BarQualityExpiryRow[]
  periods: BarQualityPeriodRow[]
  error?: string
}
