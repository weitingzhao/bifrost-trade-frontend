export interface ExecutionFreshnessItem {
  account_id: string
  source: string
  latest_exec_ts: number | null
  days_since_latest: number | null
}

export interface ExecutionsFreshnessResponse {
  items: ExecutionFreshnessItem[]
}

export interface TwsFetchResponse {
  ok: boolean
  count: number
  fetched_total: number
  message: string
  error?: string
}

export interface FlexFetchPerQuery {
  role: string
  query_id: string
  label: string
  rows: number
  data_from?: string
  data_to?: string
}

export interface FlexFetchResponse {
  ok: boolean
  count: number
  raw_count?: number
  data_from?: string | null
  data_to?: string | null
  range_from?: string | null
  range_to?: string | null
  updated_accounts?: number
  last_flex_date_after?: string | null
  per_query?: FlexFetchPerQuery[]
  message?: string
  error?: string
}

export interface FlexUploadResponse {
  ok: boolean
  count: number
  message?: string
  error?: string
}

export interface PerformanceSummary {
  net_pnl: number
  total_pnl?: number
  realized?: number
  total_commission: number
  trade_count: number
  win_count: number
  loss_count: number
  win_rate: number
  total_unrealized_pnl: number
  return_pct?: number
  profit_factor?: number
  max_drawdown?: number
  avg_win?: number
  avg_loss?: number
}

export interface PerformanceCalendarEntry {
  period_start_ts: number
  period_label: string
  pnl: number
  commission: number
  net_pnl: number
  trade_count: number
  win_rate?: number | null
  return_pct?: number | null
}

export interface PerformanceCalendarBySecType {
  period_start_ts: number
  period_label: string
  sec_type: string
  pnl: number
  commission: number
  net_pnl: number
  trade_count: number
}

export interface PerformanceTransaction {
  net_cash_flow?: number
  start_equity?: number
  capital_base?: number
}

export interface CumulativeCurvePoint {
  ts: number
  cumulative_net_pnl: number
}

export interface PerformanceResponse {
  summary: PerformanceSummary
  transaction?: PerformanceTransaction
  calendar?: PerformanceCalendarEntry[]
  calendar_by_sec_type?: PerformanceCalendarBySecType[]
  cumulative_curve?: CumulativeCurvePoint[]
  realized_by_account?: Record<string, number>
  realized_by_sec_type?: { sec_type: string; total_pnl: number; commission: number; net_pnl: number; trade_count: number; return_pct?: number }[]
  realized_by_strategy_opportunity?: Record<string, number>
  realized_by_strategy_instance?: Record<string, number>
  unrealized?: number
  unrealized_by_account?: Record<string, number>
  unrealized_by_sec_type?: { sec_type: string; total_pnl: number }[]
}

export interface PerformanceParams {
  since_ts?: number
  until_ts?: number
  account_id?: string
  granularity?: 'day' | 'week' | 'month'
  strategy_opportunity_id?: number
  strategy_instance_id?: number
  source_scope?: 'performance_book' | 'on_the_fly'
  summary_only?: boolean
}

export interface ExecutionsRangeParams {
  since_ts?: number
  until_ts?: number
  limit?: number
  include_opt_pairs?: boolean
  strategy_opportunity_id?: number
  strategy_instance_id?: number
  source_scope?: 'performance_book' | 'on_the_fly' | 'tws_raw'
  account_id?: string
}

export interface OptionStockLinkBatch {
  account_id: string
  option_account_executions_ids: number[]
}

export interface OptionStockLink {
  option_execution_id: number
  stock_execution_id: number
  allocated_shares: number
  slippage?: number
}

export interface OptionStockLinksResponse {
  links: OptionStockLink[]
}

// --- Bulk Performance engine types ---

export interface BackendOptPair {
  leg_c_execution_id: number
  leg_p_execution_id: number
  account_id: string
  symbol: string
  expiry: string
  strike: string
  quantity: number
  c_side: string
  c_price: number
  p_side: string
  p_price: number
  commission: number
  net_pnl: number
}

export interface OptionStockLinkSummary {
  links: OptionStockLink[]
  slippage_total: number | null
}

export interface PerformanceDayPnLCell {
  realized: number
  unrealized: number
}

export interface ByDayRangeData {
  opt: Record<string, PerformanceDayPnLCell>
  stock: Record<string, PerformanceDayPnLCell>
  stocks: Record<string, PerformanceDayPnLCell>
  fixed_income: Record<string, PerformanceDayPnLCell>
  cash_like: Record<string, PerformanceDayPnLCell>
  stkBucketNotional: {
    stocks: Record<string, number>
    fixed_income: Record<string, number>
    cash_like: Record<string, number>
  }
}

export interface PerformanceDayPnLBulkResult {
  calendarDayPnLByAsset: Record<string, Record<string, PerformanceDayPnLCell>>
  byDayRangeData: ByDayRangeData
  calendarStkNotionalByBucket: Record<string, Record<string, number>>
  linkByOptionId: Record<number, OptionStockLinkSummary>
  rawExecsWindow: import('@/types/positions').Execution[]
}

export interface RawExecution {
  account_executions_id: number
  side: string
  quantity: number
  price: number
  commission: number
  sec_type: string
  strike: number | null
  option_right: string | null
  realized_pnl: number | null
  net_cash: number | null
}

export interface RawExecutionsResponse {
  executions: RawExecution[]
}
