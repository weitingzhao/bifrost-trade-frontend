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
  price: number
  time: number | null
  exec_id?: string
  source?: string
  strategy_instance_id?: number | null
  strategy_opportunity_id?: number | null
  strategy_opportunity_name?: string | null
  strategy_instance_label?: string | null
  unrealized_pnl?: number | null
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
  opened_at: number | null
  closed_at: number | null
}

export interface StrategyInstancesResponse {
  items: StrategyInstance[]
}

export interface CreateStrategyInstanceBody {
  strategy_opportunity_id: number
  account_id: string
  opened_at?: string
  label?: string
}

export interface StrategyOpportunity {
  strategy_opportunity_id: number
  name: string
  symbol: string
  scope_type: string | null
  structure_type_id: number | null
  status: string
  created_at: number | null
}

export interface StrategyStructure {
  structure_type_id: number
  name: string
  code: string
  legs: StructureLeg[]
}

export interface StructureLeg {
  role: string
  sec_type: string
  right?: string
  qty_multiplier: number
}

export interface OpportunitiesResponse {
  items: StrategyOpportunity[]
}

export interface StructuresResponse {
  items: StrategyStructure[]
}
