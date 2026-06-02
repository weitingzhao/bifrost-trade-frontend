export interface ScreenerFilters {
  structure_type: string
  symbols: string[]
  dte_min: number | null
  dte_max: number | null
  max_prob_itm: number | null
  min_annualized_return: number | null
  max_spread_pct: number | null
  min_premium: number | null
  include_earnings_span: boolean
  source: string
}

export interface ScreenerContractRow {
  strike: number
  right: 'C' | 'P'
  dte: number
  expiry: string
  score: number
  rating: 'A' | 'B' | 'C' | 'D'
  risk: 'low' | 'medium' | 'high'
  iv: number | null
  premium: number | null
  prob_itm: number | null
  margin: number | null
  bid: number | null
  ask: number | null
  mid: number | null
  spread_pct: number | null
  oi: number | null
  delta: number | null
  gamma: number | null
  theta: number | null
  vega: number | null
}

export interface ScreenerSymbolGroup {
  symbol: string
  spot: number
  best_score: number
  avg_iv: number
  contract_count: number
  contracts: ScreenerContractRow[]
}

export interface ScreenerResponse {
  ok: boolean
  structure_type: string
  groups: ScreenerSymbolGroup[]
  total_contracts: number
  symbols_scanned: string[]
  symbols_failed: string[]
  warnings: Record<string, string>
}

export interface GreeksRow {
  expiry: string
  strike: number
  right: string
  market_price: number
  stock_price: number
  t_years: number
  t_days: number
  iv: number | null
  delta: number | null
  gamma: number | null
  theta: number | null
  vega: number | null
}

export interface GreeksResponse {
  ok: boolean
  symbol: string
  trade_date: string
  stock_price: number | null
  risk_free_rate: number
  count: number
  rows: GreeksRow[]
  error?: string
}

export interface FetchGreeksParams {
  symbol: string
  trade_date: string
  risk_free_rate?: number
  expiry?: string
  right?: string
  limit?: number
}

export interface SepaConditionResult {
  condition_id: string
  label: string
  pass: boolean
  value: number | null
}

export interface SepaSymbolResult {
  symbol: string
  technical_pass: boolean
  insufficient_data: boolean
  pass_count: number
  fail_count: number
  conditions: SepaConditionResult[]
  metrics: Record<string, number | null>
}

export interface SepaPhase1Request {
  symbols: string[]
  as_of_date?: string
  volume_threshold?: number
  strict_sma200_rising?: boolean
  source?: string
}

export interface SepaFundamentalsRequest {
  symbols: string[]
  as_of_date?: string
  eps_q2q_threshold?: number
  rev_q2q_threshold?: number
  eps_3y_threshold?: number
  rev_3y_threshold?: number
}

export interface SepaResponse {
  ok: boolean
  as_of_date: string
  source: string
  results: SepaSymbolResult[]
  summary: {
    total: number
    passed: number
    failed: number
    insufficient_data: number
  }
  warnings: Record<string, string>
  rule_version: string
}

export interface DataReadinessSummary {
  universe_count: number
  tickers_active_count: number
  price_readiness_live: {
    total_symbols: number
    price_ready: number
  } | null
  snapshot_populated: boolean
  snapshot_today: boolean
  fundamentals_coverage: Record<string, { total: number; with_data: number }> | null
}

// --- Stock Inspector Panel ---

export interface TickerOverview {
  ok: boolean
  error?: string
  found?: boolean
  symbol?: string
  name?: string | null
  primary_exchange?: string | null
  sector?: string | null
  industry?: string | null
  market_cap?: number | null
  total_employees?: number | null
  description?: string | null
  address_city?: string | null
  address_state?: string | null
  list_date?: string | null
  exchange?: string | null
  homepage_url?: string | null
  related_tickers?: string[]
}

export interface FundamentalConditionRow {
  id: string
  group?: string
  pass: boolean
  actual: number | string | null
  threshold: number | string | null
  reason: string | null
}

export interface FundGroupSummary {
  total: number
  pass_count: number
  pass: boolean
  insufficient: boolean
}

export interface FundamentalConditionsData {
  ok: boolean
  error?: string
  symbol?: string
  found?: boolean
  as_of_date?: string
  pass_count?: number
  fundamental_pass?: boolean
  insufficient_data?: boolean
  conditions?: FundamentalConditionRow[]
  groups?: Record<string, FundGroupSummary> | null
}

export interface TechnicalConditionRow {
  id: string
  pass: boolean
  actual: number | null
  threshold: number | null
  reason: string | null
}

export interface TierMomentumIndicator {
  id: string
  pass: boolean
  actual: number | null
  threshold?: number | number[] | null
  reason?: string
}

export interface TierMomentum {
  score: number
  max: number
  indicators: TierMomentumIndicator[]
}

export interface TierStructureDiagnostic {
  id: string
  active: boolean
  value: number | null
  threshold?: number
}

export interface TierStructure {
  diagnostics: TierStructureDiagnostic[]
  metrics: Record<string, number | null>
  patterns: { id: string }[]
  pattern_metrics: Record<string, number | boolean | null>
}

export interface TierSentimentShort {
  days_to_cover: number | null
  si_pct_change_2w: number | null
  sv_ratio_avg_4w: number | null
  sv_ratio_trend_falling: boolean | null
  staleness_days: number | null
}

export interface TierSentimentIndicator {
  id: string
  pass: boolean
  actual: number | boolean | null
  threshold: number | null
  reason?: string
}

export interface TierSentiment {
  short: TierSentimentShort
  indicators: TierSentimentIndicator[]
}

export interface TechnicalTiers {
  core: { pass: boolean; pass_count: number; fail_count: number }
  momentum: TierMomentum
  structure: TierStructure
  sentiment: TierSentiment
}

export interface TechnicalConditionsData {
  ok: boolean
  error?: string
  symbol?: string
  found?: boolean
  as_of_date?: string
  pass_count?: number
  technical_pass?: boolean
  insufficient_data?: boolean
  conditions?: TechnicalConditionRow[]
  metrics?: Record<string, number | null>
  tiers?: TechnicalTiers
}

export interface FundRawQuarterRow {
  fiscal_year: number
  fiscal_quarter: number
  eps: number | null
  revenues: number | null
}

export interface FundRawAnnualRow {
  fiscal_year: number
  eps: number | null
  revenues: number | null
}

export interface FundRawData {
  ok: boolean
  error?: string
  symbol?: string
  quarterly: FundRawQuarterRow[]
  annual: FundRawAnnualRow[]
  metrics: Record<string, number | null>
}

/** Pre-loaded fundamental snapshot from screener table row (before full API fetch). */
export interface StockInspectorFundamentalSeed {
  passCount: number
  passedConditions?: string[]
  insufficientData?: boolean
}

export interface BalanceSheetRow {
  period_end: string
  fiscal_year: number
  fiscal_quarter: number
  cash_and_equivalents: number | null
  total_current_assets: number | null
  total_current_liabilities: number | null
  total_assets: number | null
  total_liabilities: number | null
  total_equity: number | null
  receivables: number | null
  inventories: number | null
  debt_current: number | null
  long_term_debt_and_capital_lease_obligations: number | null
  property_plant_equipment_net: number | null
  retained_earnings_deficit: number | null
}

export interface CashFlowRow {
  period_end: string
  fiscal_year: number
  fiscal_quarter: number
  net_income: number | null
  net_cash_from_operating_activities: number | null
  net_cash_from_investing_activities: number | null
  net_cash_from_financing_activities: number | null
  depreciation_depletion_and_amortization: number | null
  purchase_of_property_plant_and_equipment: number | null
  change_in_cash_and_equivalents: number | null
}

export interface RatiosRow {
  date: string
  price_to_earnings: number | null
  price_to_sales: number | null
  price_to_book: number | null
  price_to_free_cash_flow: number | null
  debt_to_equity: number | null
  return_on_equity: number | null
  return_on_assets: number | null
  market_cap: number | null
  free_cash_flow: number | null
  earnings_per_share: number | null
  average_volume: number | null
  dividend_yield: number | null
}

export interface ShortInterestRow {
  settlement_date: string
  short_interest: number | null
  avg_daily_volume: number | null
  days_to_cover: number | null
}

export interface ShortVolumeRow {
  trade_date: string
  short_volume: number | null
  short_volume_ratio: number | null
  total_volume: number | null
}

export interface SymbolStatementsData {
  ok: boolean
  error?: string
  symbol?: string
  balance_sheets: BalanceSheetRow[]
  cash_flows: CashFlowRow[]
  ratios: RatiosRow[]
  short_interest: ShortInterestRow[]
  short_volume: ShortVolumeRow[]
}

export interface SymbolOptionPcrTrendPoint {
  trade_date: string
  put_oi: number
  call_oi: number
  oi_ratio: number | null
  put_vol: number | null
  call_vol: number | null
  vol_ratio: number | null
}

export interface SymbolOptionChainExpiryRow {
  expiry: string
  expiration_label: string
  dte: number | null
  put_vol: number
  call_vol: number
  total_vol: number
  pc_vol: number | null
  put_oi: number
  call_oi: number
  total_oi: number
  pc_oi: number | null
}

export interface SymbolOptionPcrData {
  ok: boolean
  error?: string
  symbol?: string
  as_of_date?: string | null
  stale_days?: number | null
  oi_ratio?: number | null
  vol_ratio?: number | null
  avg_oi_5d?: number | null
  lookback_days?: number
  trend?: SymbolOptionPcrTrendPoint[]
  chain_by_expiry?: SymbolOptionChainExpiryRow[]
}
