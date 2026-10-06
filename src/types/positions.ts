import type { IbPositionRow } from './monitor'
import type { ExecutionRow, FillSplit } from '@/lib/schemas/positions'
import type { RiskProfile, RiskScenarioBreakdown, RiskCalcContext } from '@/utils/riskProfile'
import type { ExecutionCreateBody, ExecutionUpdateBody } from './requestBodies'

export type { RiskProfile, RiskScenarioBreakdown, RiskCalcContext }

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
  /**
   * Where `mark_price` came from when the attribution row priced it (core 0.51.0, TD-171):
   * 'vendor_eod' is the vendor's close of `mark_date`, not a live quote. Absent for an IB
   * live price, an off-track leg, or an API older than core 0.51.0.
   */
  mark_source?: AttributionMarkSource | null
  /** New York date (YYYY-MM-DD) the mark belongs to. */
  mark_date?: string | null
  unrealized_pnl: number
  pool_label: 'On' | 'Off'
  account_id: string
  position?: LivePositionRow
  attribution_type?: 'single' | 'mixed' | 'unassigned'
  attribution_ratio?: number
  trade_id?: number | null
  trade_label?: string | null
  strategy_opportunity_name?: string | null
  filtered_exec_lists?: { final: Execution[]; tws: Execution[] }
  trades?: Execution[]
}

export interface TradePositionGroup {
  trade_id: number | null
  trade_label: string | null
  strategy_opportunity_name: string | null
  strategy_opportunity_id: number | null
  trade_opened_at_epoch: number | null
  positions: OpenOptionPosition[]
  total_unrealized_pnl: number
}

export interface TradeStockCoverage {
  symbol: string
  account_id: string
  required_shares: number
  direction: 'long' | 'short'
}

export interface StockCoverageItem {
  symbol: string
  account_id: string
  required_shares: number
  /** Watchlist-scoped hedge demand only (Legacy backing pool). */
  required_watchlist_shares?: number
  held_shares: number
  surplus_or_gap: number
  trades_needing: number
  backing_opportunities?: string[]
  watchlist_scope_trades?: number
  optionable_supported?: boolean | null
  avg_cost_per_share?: number | null
  live_last_price?: number | null
  cost_basis_total?: number | null
  daily_pnl?: number | null
  daily_pct?: number | null
  total_pnl?: number | null
  total_pct?: number | null
}

export interface TradeAllGroup {
  trade_id: number | null
  trade_label: string | null
  strategy_opportunity_name: string | null
  strategy_opportunity_id: number | null
  trade_opened_at_epoch: number | null
  options: OpenOptionPosition[]
  stock_coverage: TradeStockCoverage[]
  options_unrealized_pnl: number
  /**
   * The template the instance's structure is built from (`covered_call_otm`) and its
   * display name. 'structure' is the strategy_structure row (debt TD-41): the Positions
   * filter keys on the template code, never on a structure name.
   */
  template_code: string | null
  template_label: string | null
  /** The strategy_structure row's own name ("Covered Call 10% OTM"). */
  structure_name: string | null
  scope_type: string | null
  risk_profile: RiskProfile | null
}

/** core 0.51.0 (TD-140): a fresh live quote, or the vendor's newest session close. */
export type AttributionMarkSource = 'quote_live' | 'vendor_eod'

/** One row from GET /executions/position-attribution: one (position, instance). */
export interface PositionTradeAttribution {
  account_id: string
  contract_key: string
  symbol: string
  sec_type: string
  expiry: string
  strike: number | null
  option_right: string
  position_qty: number
  avg_cost: number | null
  /** A live mid only; never a close. */
  price_mid: number | null
  /** A live last, or — from core 0.51.0, with no live quote — the vendor close of `mark_date`. */
  price_last: number | null
  /** core 0.51.0; absent from an older API. null: nothing priced the row. */
  mark_source?: AttributionMarkSource | null
  /** core 0.51.0: the New York date (YYYY-MM-DD) of the price. */
  mark_date?: string | null
  trade_id: number | null
  trade_label: string | null
  strategy_opportunity_id: number | null
  strategy_opportunity_name: string | null
  trade_opened_at_epoch: number | null
  /** core 0.32.1 (TD-41); absent from an older API. */
  strategy_structure_name?: string | null
  template_code?: string | null
  /** @deprecated The structure's name under an old key; read `strategy_structure_name`. */
  structure_type: string | null
  scope_type: string | null
  strategy_structure_id: number | null
  open_qty_est: number
  attribution_ratio: number
  unrealized_pnl_est: number | null
  source_exec_count: number
  is_mixed: boolean
  has_unassigned: boolean
  method?: string
}

/** @deprecated Use PositionTradeAttribution */
export type PositionAttribution = PositionTradeAttribution

export interface PositionAttributionResponse {
  items: PositionTradeAttribution[]
}

export type { FillSplit }

/** One execution row as the API sends it — see `ExecutionRowSchema` for the wire rules. */
export type Execution = ExecutionRow

export interface ExecutionsResponse {
  items: Execution[]
}

/** A split as the FE sends it: both fields, always. */
interface FillSplitPayload {
  trade_id: number
  quantity: number
}

/** `ExecutionCreateBody` (POST /executions) as the fill forms send it. */
export interface CreateExecutionBody extends ExecutionCreateBody {
  account_id: string
  time: number
  symbol: string
  sec_type: 'STK' | 'OPT'
  side: 'BUY' | 'SELL'
  fill_splits?: FillSplitPayload[]
}

/** `ExecutionUpdateBody` (PUT /executions/{id}): the fields sent change. */
export interface UpdateExecutionBody extends ExecutionUpdateBody {
  fill_splits?: FillSplitPayload[]
}

// ── Strategy types — re-exported for backward compatibility ───────────────────
// Primary definitions live in @/types/strategy
export type {
  Trade,
  TradesResponse,
  CreateTradeBody,
  PatchTradeBody,
  StrategyOpportunity,
  EntryCondition,
  EntryConditionInput,
  StrategyOpportunityDetail,
  CreateOpportunityBody,
  OpportunitiesResponse,
  StructureLeg,
  StrategyStructure,
  StructuresResponse,
  StructurePayload,
  StructureMetaEntry,
  GateSetItem,
  GateSetGates,
  GateSetFull,
  GateSetPayload,
  GateSetResponse,
  ActiveStrategyPayload,
  StrategyDimRow,
  DimsGroupedResponse,
  StrategyTemplateRow,
  MetaParamItem,
  StrategyTemplateDetail,
  TemplateLegPayload,
  MetaParamPayload,
  TemplateConfigOption,
  StrategyTemplatesResponse,
  StrategyAllocation,
  AllocationPayload,
  AllocationsResponse,
  WinRateStructureRow,
  WinRateResponse,
} from './strategy'
