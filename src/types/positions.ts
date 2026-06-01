import type { IbPositionRow } from './monitor'
import type { RiskProfile, RiskScenarioBreakdown, RiskCalcContext } from '@/utils/riskProfile'

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
  unrealized_pnl: number
  pool_label: 'On' | 'Off'
  account_id: string
  position?: LivePositionRow
  attribution_type?: 'single' | 'mixed' | 'unassigned'
  attribution_ratio?: number
  strategy_instance_id?: number | null
  strategy_instance_label?: string | null
  strategy_opportunity_name?: string | null
  filtered_exec_lists?: { final: Execution[]; tws: Execution[] }
  trades?: Execution[]
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
  /** Watchlist-scoped hedge demand only (Legacy backing pool). */
  required_watchlist_shares?: number
  held_shares: number
  surplus_or_gap: number
  instances_needing: number
  backing_opportunities?: string[]
  watchlist_scope_instances?: number
  optionable_supported?: boolean | null
  avg_cost_per_share?: number | null
  live_last_price?: number | null
  cost_basis_total?: number | null
  daily_pnl?: number | null
  daily_pct?: number | null
  total_pnl?: number | null
  total_pct?: number | null
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

/** One row from GET /executions/position-attribution: one (position, instance). */
export interface PositionInstanceAttribution {
  account_id: string
  contract_key: string
  symbol: string
  sec_type: string
  expiry: string
  strike: number | null
  option_right: string
  position_qty: number
  avg_cost: number | null
  price_mid: number | null
  price_last: number | null
  strategy_instance_id: number | null
  strategy_instance_label: string | null
  strategy_opportunity_id: number | null
  strategy_opportunity_name: string | null
  strategy_instance_opened_at_epoch: number | null
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

/** @deprecated Use PositionInstanceAttribution */
export type PositionAttribution = PositionInstanceAttribution

export interface PositionAttributionResponse {
  items: PositionInstanceAttribution[]
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
  report_date?: string | null
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

// ── Strategy types — re-exported for backward compatibility ───────────────────
// Primary definitions live in @/types/strategy
export type {
  StrategyInstance,
  StrategyInstancesResponse,
  CreateStrategyInstanceBody,
  PatchStrategyInstanceBody,
  StrategyOpportunity,
  EntryCondition,
  StrategyOpportunityDetail,
  CreateOpportunityBody,
  OpportunitiesResponse,
  StructureLeg,
  StructureConstraint,
  StrategyStructure,
  StructuresResponse,
  StructurePayload,
  StructureMetaEntry,
  StrategyHistoryRow,
  StrategyHistoryParams,
  StrategyHistoryResponse,
  GateSafetyItem,
  GateSafetyGates,
  GateSafetyFull,
  GateSafetyPayload,
  GateSafetyResponse,
  ActiveStrategyPayload,
  StrategyDimRow,
  DimsGroupedResponse,
  StrategyTemplateRow,
  MetaParamItem,
  StrategyTemplateDetail,
  StructureTypeLegPayload,
  MetaParamPayload,
  StructureTypeConfigOption,
  StrategyTemplatesResponse,
  StrategyAllocation,
  AllocationPayload,
  AllocationsResponse,
  WinRateStructureRow,
  WinRateResponse,
} from './strategy'
