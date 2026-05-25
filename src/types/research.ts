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
  symbol: string
  expiration: string
  strike: number
  right: 'C' | 'P'
  stock_price: number
  market_price: number
  iv: number
  delta: number
  gamma: number
  theta: number
  vega: number
  t_years: number
}

export interface GreeksResponse {
  rows: GreeksRow[]
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

export interface FundamentalConditionsData {
  ok: boolean
  error?: string
  symbol?: string
  as_of_date?: string
  pass_count?: number
  fundamental_pass?: boolean
  insufficient_data?: boolean
  conditions?: FundamentalConditionRow[]
}

export interface TechnicalConditionRow {
  id: string
  pass: boolean
  actual: number | null
  threshold: number | null
  reason: string | null
}

export interface TechnicalConditionsData {
  ok: boolean
  error?: string
  symbol?: string
  as_of_date?: string
  pass_count?: number
  technical_pass?: boolean
  insufficient_data?: boolean
  conditions?: TechnicalConditionRow[]
  metrics?: Record<string, number | null>
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
