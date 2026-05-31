export interface SepaConditionStat {
  id: string
  label: string
  group?: string
  pass: number
  fail: number
  no_data: number
  total: number
}

export interface TechConditionStat {
  id: string
  label: string
  pass: number
  fail: number
}

export interface FundGroupSummary {
  total: number
  pass_count: number
  pass: boolean
  insufficient: boolean
}

export interface FundPassCountBucket {
  conditions_passed: number
  symbol_count: number
}

export interface TechPassCountBucket {
  conditions_passed: number
  symbol_count: number
}

export interface SepaCriteriaStats {
  ok: boolean
  error?: string
  universe_count: number
  fundamental: {
    cached_count: number
    fund_pass_count: number
    no_data_count: number
    conditions: SepaConditionStat[]
    pass_count_distribution?: FundPassCountBucket[]
    groups?: Record<string, { cached_count: number; pass_count: number; conditions: SepaConditionStat[] }>
  }
  technical: {
    total_in_snapshot: number
    price_ready_count: number
    fund_cached_count: number
    both_ready: number
    bars_ge_252: number
    bars_ge_240: number
    bars_ge_200: number
    bars_lt_200: number
    no_bars: number
    failure_reasons: Array<{ notes: string | null; cnt: number }>
    tech_cached_count: number
    tech_pass_count: number
    tech_insufficient_count: number
    conditions: TechConditionStat[]
    pass_count_distribution?: TechPassCountBucket[]
    momentum_conditions?: TechConditionStat[]
    momentum_score_distribution?: Array<{ score: number; symbol_count: number }>
    structure_conditions?: TechConditionStat[]
    sentiment_conditions?: TechConditionStat[]
  }
  computed_at: string
}

export interface FundDistSymbolRow {
  symbol: string
  pass_count: number
  passed_conditions: string[]
  passed_conditions_by_group?: Record<string, string[]>
}

export interface FundDistSymbolsResponse {
  ok: boolean
  error?: string
  conditions_passed: number
  count: number
  symbols: FundDistSymbolRow[]
}

export interface TechDistSymbolRow {
  symbol: string
  pass_count: number
  passed_conditions: string[]
}

export interface TechDistSymbolsResponse {
  ok: boolean
  error?: string
  conditions_passed: number
  count: number
  symbols: TechDistSymbolRow[]
}

export interface FundamentalFilterResponse {
  ok: boolean
  error?: string
  include?: string[]
  count?: number
  symbols?: FundDistSymbolRow[]
  limit?: number
}

export interface TechFilterSymbolRow {
  symbol: string
  pass_count: number
  passed_conditions: string[]
}

export interface TechnicalFilterResponse {
  ok: boolean
  error?: string
  include?: string[]
  count?: number
  symbols?: TechFilterSymbolRow[]
  limit?: number
}

export interface MomentumFilterSymbol {
  symbol: string
  momentum_score: number
  core_pass_count: number
}

export interface MomentumFilterResponse {
  ok: boolean
  error?: string
  include?: string[]
  min_score?: number
  count?: number
  symbols?: MomentumFilterSymbol[]
  limit?: number
}

export interface TierFilterResponse {
  ok: boolean
  error?: string
  tier?: string
  include?: string[]
  min_score?: number
  count?: number
  symbols?: { symbol: string; tier_score: number; core_pass_count: number }[]
  limit?: number
}

export interface ReadinessSnapshotRow {
  symbol: string
  found: boolean
  as_of_date?: string | null
  included_in_universe?: boolean
  price_ready?: boolean
  bar_count_lookback?: number
  first_bar_date?: string | null
  last_bar_date?: string | null
  income_stmt_ready?: boolean
  income_stmt_q_count?: number
  income_stmt_a_count?: number
  balance_sheet_present?: boolean
  cash_flow_present?: boolean
  ratios_present?: boolean
  short_interest_present?: boolean
  short_volume_present?: boolean
  fundamental_pass?: boolean
  fundamental_pass_count?: number
  fundamental_insufficient?: boolean
  passed_conditions?: string[]
  passed_conditions_by_group?: Record<string, string[]>
  fund_groups?: Record<string, FundGroupSummary> | null
  technical_pass?: boolean
  technical_pass_count?: number
  technical_insufficient?: boolean
  passed_tech_conditions?: string[]
}

export interface SymbolsReadinessSnapshotResponse {
  ok: boolean
  error?: string
  as_of_date?: string | null
  count?: number
  symbols?: ReadinessSnapshotRow[]
}

export interface TierFilterState {
  indicators: Set<string>
  minScore: number
}

export interface FilterPreview {
  symbols: string[]
  parts: string
}

export type SortColumn = 'tech' | 'fund' | null
export type SortDirection = 'desc' | 'asc'

export type DistVariant = 'tech' | 'fund'
