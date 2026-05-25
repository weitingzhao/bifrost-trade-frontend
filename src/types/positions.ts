import type { IbPositionRow } from './monitor'

export type LivePositionRow = IbPositionRow & {
  account_id: string
}

export interface OpenOptionPosition {
  kind: 'live' | 'offtrack'
  contract_key: string
  symbol: string
  strike: number
  expiry: string
  right: string
  qty: number
  avg_cost: number | null
  mark_price: number | null
  unrealized_pnl: number
  pool_label: 'On' | 'Off'
  account_id: string
  position?: LivePositionRow
  attribution_type?: 'single' | 'mixed' | 'unassigned'
  attribution_ratio?: number
  strategy_instance_id?: number | null
  strategy_instance_label?: string | null
  strategy_opportunity_name?: string | null
}

export interface InstancePositionGroup {
  strategy_instance_id: number | null
  strategy_instance_label: string | null
  strategy_opportunity_name: string | null
  strategy_opportunity_id: number | null
  strategy_instance_opened_at_epoch: number | null
  positions: OpenOptionPosition[]
  total_unrealized_pnl: number
}

export interface InstanceStockCoverage {
  symbol: string
  account_id: string
  required_shares: number
  direction: 'long' | 'short'
}

export interface StockCoverageItem {
  symbol: string
  account_id: string
  required_shares: number
  held_shares: number
  surplus_or_gap: number
  instances_needing: number
  backing_opportunities?: string[]
  optionable_supported?: boolean | null
  avg_cost_per_share?: number | null
  live_last_price?: number | null
  cost_basis_total?: number | null
  daily_pnl?: number | null
  daily_pct?: number | null
  total_pnl?: number | null
  total_pct?: number | null
}

export interface RiskProfile {
  max_gain: number | null
  max_loss: number | null
  risk_type: 'defined' | 'unlimited' | 'unknown'
  breakeven_points: number[]
}

export interface InstanceAllGroup {
  strategy_instance_id: number | null
  strategy_instance_label: string | null
  strategy_opportunity_name: string | null
  strategy_opportunity_id: number | null
  strategy_instance_opened_at_epoch: number | null
  options: OpenOptionPosition[]
  stock_coverage: InstanceStockCoverage[]
  options_unrealized_pnl: number
  structure_type: string | null
  scope_type: string | null
  risk_profile: RiskProfile | null
}

export interface PositionAttribution {
  contract_key: string
  account_id: string
  attribution_type: 'single' | 'mixed' | 'unassigned'
  strategy_instance_id: number | null
  strategy_instance_label: string | null
  strategy_opportunity_id: number | null
  strategy_opportunity_name: string | null
  attribution_ratio: number
}

export interface PositionAttributionResponse {
  items: PositionAttribution[]
}

export interface InstanceAllocation {
  strategy_instance_id: number
  allocated_quantity: number
  strategy_instance_label?: string | null
  strategy_opportunity_name?: string | null
}

export interface Execution {
  account_executions_id: number | null
  account_id: string
  contract_key: string
  symbol: string
  sec_type: string
  right?: string
  strike?: number
  expiry?: string
  side: 'Buy' | 'Sell'
  qty: number
  quantity?: number
  price: number
  time: number | null
  trade_date?: string | null
  exec_id?: string
  source?: string
  commission?: number | null
  realized_pnl?: number | null
  net_cash?: number | null
  taxes?: number | null
  option_right?: string | null
  strategy_instance_id?: number | null
  strategy_opportunity_id?: number | null
  strategy_opportunity_name?: string | null
  strategy_instance_label?: string | null
  unrealized_pnl?: number | null
  instance_allocations?: InstanceAllocation[]
}

export interface ExecutionsResponse {
  items: Execution[]
}

export interface CreateExecutionBody {
  account_id: string
  time: number
  symbol: string
  sec_type: 'STK' | 'OPT'
  side: 'BUY' | 'SELL'
  quantity: number
  price: number
  source?: string
  expiry?: string
  strike?: number
  option_right?: string
  contract_key?: string
  commission?: number
  realized_pnl?: number
  currency?: string
  strategy_opportunity_id?: number | null
  strategy_instance_id?: number | null
  instance_allocations?: { strategy_instance_id: number; allocated_quantity: number }[]
}

export interface UpdateExecutionBody {
  account_id?: string
  exec_time?: number
  symbol?: string
  sec_type?: string
  side?: string
  quantity?: number
  price?: number
  expiry?: string
  strike?: number
  option_right?: string
  contract_key?: string
  commission?: number
  realized_pnl?: number
  currency?: string
  strategy_opportunity_id?: number | null
  strategy_instance_id?: number | null
  instance_allocations?: { strategy_instance_id: number; allocated_quantity: number }[]
}

export interface StrategyInstance {
  strategy_instance_id: number
  strategy_opportunity_id: number
  account_id: string
  label: string | null
  notes: string | null
  opened_at: string | null
  opened_at_epoch: number | null
  created_at: string | null
  created_at_epoch: number | null
  updated_at: string | null
  strategy_opportunity_name: string | null
  strategy_structure_id: number | null
  strategy_structure_name: string | null
  executions_count: number
}

export interface StrategyInstancesResponse {
  items: StrategyInstance[]
}

export interface CreateStrategyInstanceBody {
  strategy_opportunity_id: number
  account_id: string
  opened_at?: string
  label?: string
  notes?: string
}

export interface PatchStrategyInstanceBody {
  label?: string | null
  notes?: string | null
  opened_at?: string
}

export interface StrategyOpportunity {
  strategy_opportunity_id: number
  name: string
  strategy_structure_id: number | null
  default_gate_safety_strategy_id: number | null
  scope_type: string | null
  is_active: boolean
  created_at: string | null
  updated_at: string | null
  structure_name: string | null
  gate_safety_name: string | null
  symbols: string[]
}

export interface EntryCondition {
  condition_type: string
  value_text: string | null
  value_numeric: number | null
}

export interface StrategyOpportunityDetail extends StrategyOpportunity {
  entry_conditions: EntryCondition[]
}

export interface CreateOpportunityBody {
  name: string
  strategy_structure_id: number
  default_gate_safety_strategy_id?: number | null
  scope_type?: string | null
  symbols?: string[]
  entry_conditions?: EntryCondition[]
  is_active?: boolean
}

export interface StrategyStructure {
  strategy_structure_id: number
  name: string
  structure_type: string | null
  structure_subtype: string | null
  structure_subtype_label: string | null
  strategy_template_id: number | null
  template_code: string | null
  template_display_name: string | null
  dim_direction: string | null
  dim_structure: string | null
  dim_coverage: string | null
  dim_risk: string | null
  dim_volatility: string | null
  dim_time: string | null
  version: number
  is_active: boolean
  created_at: string | null
  updated_at: string | null
  notes: string | null
  legs: StructureLeg[]
  constraints: StructureConstraint[]
}

export interface StructureLeg {
  role: string | null
  direction: string | null
  option_right: string | null
  quantity: number
  strike: number | null
  expiration: string | null
}

export interface StructureConstraint {
  constraint_type: string
  constraint_value_text: string | null
  constraint_value_int: number | null
}

export interface GateSafetyItem {
  gate_safety_strategy_id: number
  name: string
  version: number
  is_active: boolean
  dim_direction?: string | null
  dim_structure?: string | null
  dim_coverage?: string | null
  dim_risk?: string | null
  dim_volatility?: string | null
  dim_time?: string | null
}

export interface GateSafetyGates {
  strategy?: {
    structure?: { min_dte?: number; max_dte?: number; atm_band_pct?: number }
    earnings?: { blackout_days_before?: number; blackout_days_after?: number }
    trading_hours_only?: boolean
  }
  state?: {
    delta?: { epsilon_band?: number; threshold_hedge_shares?: number; max_delta_limit?: number }
    market?: { vol_window_min?: number; stale_ts_threshold_ms?: number }
    liquidity?: { wide_spread_pct?: number; extreme_spread_pct?: number }
    system?: { data_lag_threshold_ms?: number }
  }
  intent?: {
    hedge?: {
      min_hedge_shares?: number
      cooldown_seconds?: number
      max_hedge_shares_per_order?: number
      min_price_move_pct?: number
    }
  }
  guard?: {
    risk?: {
      max_daily_hedge_count?: number
      max_position_shares?: number
      max_daily_loss_usd?: number
      max_net_delta_shares?: number
      max_spread_pct?: number
      paper_trade?: boolean
    }
  }
}

export interface GateSafetyFull {
  gate_safety_strategy_id: number
  name: string
  version: number
  is_active: boolean
  dim_direction?: string | null
  dim_structure?: string | null
  dim_coverage?: string | null
  dim_risk?: string | null
  dim_volatility?: string | null
  dim_time?: string | null
  gates: GateSafetyGates
  earnings_dates: string[]
}

export interface GateSafetyPayload {
  name: string
  version?: number
  dim_direction?: string | null
  dim_structure?: string | null
  dim_coverage?: string | null
  dim_risk?: string | null
  dim_volatility?: string | null
  dim_time?: string | null
  is_active?: boolean
  gates: GateSafetyGates
  earnings_dates?: string[]
}

export interface StrategyDimRow {
  strategy_dim_id: number
  dim_type: string
  code: string
  display_label: string
  sort_order: number
}

export interface DimsGroupedResponse {
  by_type: Record<string, StrategyDimRow[]>
}

export interface GateSafetyResponse {
  items: GateSafetyItem[]
}

export interface ActiveStrategyPayload {
  active_strategy_structure_id: number | null
  active_gate_safety_strategy_id: number | null
  active_strategy_allocation_id: number | null
}

export interface OpportunitiesResponse {
  items: StrategyOpportunity[]
}

export interface StructuresResponse {
  items: StrategyStructure[]
}
