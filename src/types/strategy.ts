import type { z } from 'zod'
import type {
  AllocationsResponseSchema,
  EntryConditionSchema,
  GateSetFullSchema,
  GateSetItemSchema,
  GateSetResponseSchema,
  OpportunitiesResponseSchema,
  StrategyAllocationSchema,
  TradeSchema,
  TradesResponseSchema,
  StrategyOpportunityDetailSchema,
  StrategyOpportunitySchema,
} from '@/lib/schemas/strategy'
import type {
  GateSetBody,
  TemplateBody,
  StructureBody,
  StructureMetaItem,
  TemplateLegItem,
  TemplateParamItem,
} from './requestBodies'

// The five response-modelled resources (api 0.3.1: allocations, opportunities,
// gate-safety, instances; plans in `@/lib/schemas/strategyPlan`) are inferred
// from the schemas that mirror the API's models — one description, checked at
// runtime by `withValidation` and at compile time here.

// ── Trade ─────────────────────────────────────────────────────────────────────

/** `TradeRow`: `executions_count` is in list items only. */
export type Trade = z.infer<typeof TradeSchema>
export type TradesResponse = z.infer<typeof TradesResponseSchema>

export interface CreateTradeBody {
  strategy_opportunity_id: number
  account_id: string
  opened_at?: string
  label?: string
}

/**
 * `notes` is not sent (TD-73): a trade's notes live in the journal only
 * (Research `journal.note`, refs `{type: trade}`), read and written by the
 * trade's Journal block. The column stops being written and is dropped later.
 */
export interface PatchTradeBody {
  label?: string | null
  opened_at?: string
}

// ── Strategy Opportunity ──────────────────────────────────────────────────────

/** `OpportunityRow`: `symbols` is null in the list for an opportunity without symbols. */
export type StrategyOpportunity = z.infer<typeof StrategyOpportunitySchema>
/** As the API answers it: `condition_type` may be null. */
export type EntryCondition = z.infer<typeof EntryConditionSchema>
/** A condition's own three fields — what a write carries back. */
export type EntryConditionFields = Pick<EntryCondition, 'condition_type' | 'value_text' | 'value_numeric'>
/** A condition as the opportunity forms edit it: a type is always picked (`''` = none yet). */
export interface EntryConditionInput extends EntryConditionFields {
  condition_type: string
}
/** `OpportunityDetail`: `symbols` always an array, plus the entry conditions. */
export type StrategyOpportunityDetail = z.infer<typeof StrategyOpportunityDetailSchema>

export interface CreateOpportunityBody {
  name: string
  strategy_structure_id: number
  default_gate_safety_strategy_id?: number | null
  scope_type?: string | null
  symbols?: string[]
  entry_conditions?: EntryConditionFields[]
  is_active?: boolean
}

export type OpportunitiesResponse = z.infer<typeof OpportunitiesResponseSchema>

// ── Strategy Structure ────────────────────────────────────────────────────────

export interface StructureLeg {
  role: string | null
  direction: string | null
  option_right: string | null
  quantity: number
  strike: number | null
  expiration: string | null
}

export interface StrategyStructure {
  strategy_structure_id: number
  name: string
  structure_type: string | null
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
  /** Present when fetched by id; map from strategy_structure.characteristics_json / legs_json. */
  metadata?: Record<string, unknown> | null
}

export interface StructureMetaEntry extends StructureMetaItem {
  meta_key: string
  meta_value_text: string | null
}

/**
 * Payload for create/update strategy structure (`StructureBody`). Dimensions
 * come from the linked template. Legs go back as GET returned them.
 */
export interface StructurePayload extends StructureBody {
  name: string
  legs: StructureLeg[]
  notes?: string
  meta?: StructureMetaEntry[]
}

export interface StructuresResponse {
  items: StrategyStructure[]
}

// ── Gate Safety ───────────────────────────────────────────────────────────────

export type GateSetItem = z.infer<typeof GateSetItemSchema>

export interface GateSetGates {
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

/**
 * `GET /gate-sets/defaults` — core `GateParams()` as the API holds
 * it, in the same shape as a gate row's `gates` (no earnings dates). What a new
 * gate set starts from; the UI keeps no copy of its own.
 */
export interface GateSetDefaultsResponse {
  gates: GateSetGates
}

export type GateSetFull = z.infer<typeof GateSetFullSchema>

/** `GateSetBody` as the gate form sends it. */
export interface GateSetPayload extends GateSetBody {
  name: string
  gates: GateSetGates
}

export type GateSetResponse = z.infer<typeof GateSetResponseSchema>

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
  /** Keyed by the bare dim type (`direction`) — the dictionary's own grouping. */
  by_type: Record<string, StrategyDimRow[]>
  /** The same lists keyed by the column a code is written to (`dim_direction`), the
   *  names the template / gate bodies use (api 0.6.7, TD-57). */
  by_column?: Record<string, StrategyDimRow[]>
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

/** `TemplateLegItem` as the template editor sends it (`''` for no right). */
export interface TemplateLegPayload extends TemplateLegItem {
  role: string | null
  direction: string | null
  option_right: string
  quantity_default: number
  sort_order: number
}

/** `TemplateParamItem` as the template editor sends it (strings only). */
export interface MetaParamPayload extends TemplateParamItem {
  meta_key: string
  display_label: string | null
  default_value_text: string | null
  param_kind: string
  sort_order: number
}

/** `TemplateBody` for POST /strategies/templates: core refuses one without a code (400). */
export interface CreateTemplateBody extends TemplateBody {
  template_code: string
}

export interface TemplateConfigOption {
  value: string
  label: string
}

export interface StrategyTemplatesResponse {
  items: StrategyTemplateRow[]
}

// ── Win Rate ──────────────────────────────────────────────────────────────────

export interface WinRateStructureRow {
  structure_name: string
  /** Trades in the structure (core 0.38.0, TD-19; `total_instances` went in core 0.42.0). */
  total_trades: number
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

export type StrategyAllocation = z.infer<typeof StrategyAllocationSchema>

export interface AllocationPayload {
  name: string
  strategy_opportunity_ids: number[]
  gate_safety_strategy_id?: number | null
  /** The API reads the limits only here; `max_bp_pct` is a share (0.5 = 50%). */
  allocation_limits?: { max_positions: number | null; max_bp_pct: number | null }
  is_active?: boolean
}

export type AllocationsResponse = z.infer<typeof AllocationsResponseSchema>
