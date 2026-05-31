export interface ScenarioBreakdown {
  underlying_price: number
  options_pnl: number
  stock_pnl: number
}

export interface StressScenario {
  spot_shock: number
  iv_shock: number
  new_spot?: number
  options_pnl?: number
  stock_pnl?: number
  total_pnl: number
  method?: string
}

export interface GreeksLeg {
  strike: number
  right: string
  qty: number
  iv: number | null
  delta: number | null
}

export interface GreeksInfo {
  delta: number | null
  delta_dollars: number | null
  degraded: boolean
  degraded_leg_count?: number
  per_leg?: GreeksLeg[]
}

export interface CarLegDetail {
  strike: number
  right: string
  qty: number
  car: number | null
  type: string
}

export interface CarInfo {
  effective: number | null
  explain: string
  has_unbounded: boolean
  leg_details?: CarLegDetail[]
}

export interface UnderlyingEntry {
  symbol: string
  spot: number | null
  dte_days: number | null
  farthest_expiry: string | null
  stock_qty: number
  stock_avg_cost: number | null
  max_gain: number | null
  max_loss: number | null
  risk_type: string
  breakeven_prices: number[]
  net_premium: number
  naked_short_call_contracts: number
  hedged_max_loss: number | null
  max_gain_scenario: ScenarioBreakdown | null
  max_gain_sample_scenario: ScenarioBreakdown | null
  max_loss_scenario: ScenarioBreakdown | null
  capital_at_risk: CarInfo
  annualized_return_on_car: number | null
  annualized_loss_on_car: number | null
  greeks: GreeksInfo
  stress: { available: boolean; iv_stress_available?: boolean; scenarios?: StressScenario[] }
}

export interface ModelAnalysisResponse {
  account_id: string
  account_summary: {
    net_liquidation: number | null
    total_cash: number | null
    buying_power: number | null
  }
  per_underlying: UnderlyingEntry[]
  account_rollups: {
    total_car: number | null
    car_has_unbounded: boolean
    weighted_annualized_return: number | null
    total_delta: number | null
    total_delta_dollars: number | null
  }
  account_stress: { available: boolean; iv_stress_available?: boolean; scenarios?: StressScenario[] }
  disclaimer: string
  method: string
}
