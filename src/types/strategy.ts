// ── Strategy Instance ─────────────────────────────────────────────────────────

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

// ── Strategy Opportunity ──────────────────────────────────────────────────────

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

export interface OpportunitiesResponse {
  items: StrategyOpportunity[]
}

// ── Strategy Structure ────────────────────────────────────────────────────────

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

export interface StructuresResponse {
  items: StrategyStructure[]
}

// ── Gate Safety ───────────────────────────────────────────────────────────────

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

export interface GateSafetyResponse {
  items: GateSafetyItem[]
}

// ── Active Strategy Config ────────────────────────────────────────────────────

export interface ActiveStrategyPayload {
  active_strategy_structure_id: number | null
  active_gate_safety_strategy_id: number | null
  active_strategy_allocation_id: number | null
}

// ── Strategy Dims ─────────────────────────────────────────────────────────────

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

// ── Strategy Templates ────────────────────────────────────────────────────────

export interface StrategyTemplateRow {
  strategy_template_id: number
  template_code: string
  display_name: string
  dim_direction: string | null
  dim_structure: string | null
  dim_coverage: string | null
  dim_risk: string | null
  dim_volatility: string | null
  dim_time: string | null
  explanation: string | null
  typical_use: string | null
  example: string | null
  nature: string | null
  sort_order: number
  is_active: boolean
}

export interface MetaParamItem {
  meta_key: string
  display_label: string | null
  default_value_text: string | null
  param_kind: string | null
  sort_order: number
}

export interface StrategyTemplateDetail extends StrategyTemplateRow {
  legs: StructureLeg[]
  meta_params: MetaParamItem[]
  characteristics: string[]
}

export interface StructureTypeLegPayload {
  role: string | null
  direction: string | null
  option_right: string
  quantity_default: number
  sort_order: number
}

export interface MetaParamPayload {
  meta_key: string
  display_label: string | null
  default_value_text: string | null
  param_kind: string
  sort_order: number
}

export interface StructureTypeConfigOption {
  value: string
  label: string
}

export interface StrategyTemplatesResponse {
  items: StrategyTemplateRow[]
}

// ── Win Rate ──────────────────────────────────────────────────────────────────

export interface WinRateStructureRow {
  structure_name: string
  total_instances: number
  profit_trades: number
  loss_trades: number
  total_profit: number | null
  total_loss: number | null
  profit_investment: number | null
  loss_investment: number | null
  total_investment: number | null
  total_max_risk: number | null
  structure_return_pct: number | null
  profit_avg_pct: number | null
  loss_avg_pct: number | null
  single_max_loss_pct: number | null
  profit_avg_usd: number | null
  loss_avg_usd: number | null
}

export interface WinRateResponse {
  structures: WinRateStructureRow[]
  totals_all?: WinRateStructureRow | null
}

// ── Allocation ────────────────────────────────────────────────────────────────

export interface StrategyAllocation {
  strategy_allocation_id: number
  name: string
  strategy_opportunity_ids: number[]
  gate_safety_strategy_id?: number | null
  gate_safety_name?: string | null
  max_positions?: number | null
  max_bp_pct?: number | null
  allocation_limits?: Record<string, unknown> | null
  is_active: boolean
  created_at: string | null
  updated_at: string | null
}

export interface AllocationPayload {
  name: string
  strategy_opportunity_ids: number[]
  gate_safety_strategy_id?: number | null
  max_positions?: number | null
  max_bp_pct?: number | null
  is_active?: boolean
}

export interface AllocationsResponse {
  items: StrategyAllocation[]
}
