/** Option Discovery domain types (Legacy API contracts). */

export interface OptionSnapshotRow {
  strike: number
  right: string
  snapshot_ts?: string | null
  mark?: number | null
  bid?: number | null
  ask?: number | null
  last?: number | null
  mid?: number | null
  iv?: number | null
  delta?: number | null
  gamma?: number | null
  theta?: number | null
  vega?: number | null
  open_interest?: number | null
  underlying_ticker?: string | null
  day_open?: number | null
  day_high?: number | null
  day_low?: number | null
  day_close?: number | null
  day_previous_close?: number | null
  day_change?: number | null
  day_change_percent?: number | null
  day_volume?: number | null
  day_vwap?: number | null
  day_last_updated?: string | null
  day_last_updated_day?: string | null
}

export interface OptionSnapshotsPgResult {
  symbol: string
  expiration: string
  underlying_price?: number
  rows: OptionSnapshotRow[]
  error?: string
  warning?: string
}

export interface OptionExpirationsResult {
  symbol: string
  expirations: string[]
  strikes?: number[]
  last_price?: number
  error?: string
  provider?: string
}

export interface MassiveStatusResponse {
  configured: boolean
  tier: string
  delay_notice: string
  trades_enabled: boolean
  daily_full_backfill_years: number
}

export interface MassiveDailyDimBlock {
  status?: string
  rows?: number
  last_ts?: string
  trade_date?: string
  last_trade_date?: string | null
  last_sync?: string
  connected?: boolean
  last_msg_age_s?: number | null
}

export type MassiveDailyChecklistDims = {
  'daily-snapshot'?: MassiveDailyDimBlock
  'daily-oi'?: MassiveDailyDimBlock
  'daily-max-pain'?: MassiveDailyDimBlock
  'daily-corporate'?: MassiveDailyDimBlock
  'daily-ws-alive'?: MassiveDailyDimBlock
}

export interface MaxPainStrikePoint {
  strike: number
  pain: number
  pain_call: number
  pain_put: number
  call_oi: number
  put_oi: number
}

export interface MaxPainComputeResponse {
  ok: boolean
  error?: string
  symbol?: string
  expiry?: string
  trade_date?: string
  max_pain_strike?: number
  min_pain_value?: number
  total_oi?: number
  underlying_close?: number | null
  distance_to_max_pain_pct?: number | null
  pain_by_strike?: MaxPainStrikePoint[]
  recent_corporate_action?: boolean
  oi_basis?: string
}

export interface MaxPainHistoryPoint {
  trade_date: string
  max_pain_strike: number
  total_oi: number
  underlying_close?: number | null
}

export interface IvTermStructurePoint {
  expiration: string
  dte_days: number
  atm_iv: number | null
  iv_call?: number | null
  iv_put?: number | null
  strike?: number
}

export interface IvTermStructureResponse {
  ok: boolean
  symbol: string
  underlying_price?: number
  points: IvTermStructurePoint[]
  error?: string
}

export interface IvVolatilityConePoint {
  expiration: string
  dte_days: number
  atm_iv: number | null
  iv_call?: number | null
  iv_put?: number | null
  strike?: number | null
  iv_p10: number | null
  iv_p50: number | null
  iv_p90: number | null
  iv_min: number | null
  iv_max: number | null
  sample_days: number
  iv_hist_mean?: number | null
  iv_hist_stdev?: number | null
  iv_hist_min?: number | null
  iv_hist_max?: number | null
  iv_hist_plus_1sd?: number | null
  iv_hist_minus_1sd?: number | null
  iv_hist_plus_2sd?: number | null
  iv_hist_minus_2sd?: number | null
}

export interface IvVolatilityConeResponse {
  ok: boolean
  symbol: string
  points: IvVolatilityConePoint[]
  error?: string
}

export interface GreeksCoverageResponse {
  ok: boolean
  symbol?: string
  expiration?: string
  source?: string
  total?: number
  coverage?: Record<string, number | undefined>
  freshness?: {
    oldest_ts?: string | null
    newest_ts?: string | null
    stale_rows?: number
  }
  error?: string
}

export interface LiquiditySummaryResponse {
  ok: boolean
  symbol?: string
  expiration?: string
  strike?: number
  right?: string
  source?: string
  spread_pct?: number | null
  spread_percentile?: number | null
  oi?: number | null
  oi_percentile?: number | null
  contracts_compared?: number
  snapshot_ts?: string | null
  error?: string
}

export interface RelativeValueResponse {
  ok: boolean
  label?: string | null
  iv_zscore?: number | null
  this_iv?: number | null
  avg_iv?: number | null
  std_iv?: number | null
  contracts_compared?: number
  iv_curve?: { strike: number; iv: number }[]
  error?: string
}

export interface MassiveJobPollResult {
  ok: boolean
  status?: string
  error?: string
}

export interface MassiveJobDetail {
  job_id: string
  kind?: string
  status?: string
  result?: unknown
  created_ts?: number
  updated_ts?: number
}

export type ChainColumnId =
  | 'day_open'
  | 'day_high'
  | 'day_low'
  | 'day_close'
  | 'day_vol'
  | 'iv'
  | 'delta'
  | 'gamma'
  | 'theta'
  | 'vega'
  | 'oi'

export type StrikeSideMode = 'all' | 'call' | 'put'
export type GreeksSource = 'snapshot' | 'bs'

export interface CompareRow {
  contractKey: string
  symbol: string
  expiration: string
  strike: number
  right: string
  bid: number | null
  ask: number | null
  mid: number | null
  iv: number | null
  mark: number | null
}

export interface SnapshotFeedback {
  level: 'error' | 'warning' | 'info'
  title?: string
  body: string
}
