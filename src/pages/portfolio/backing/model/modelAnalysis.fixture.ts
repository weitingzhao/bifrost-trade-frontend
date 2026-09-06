/** A two-symbol model response the band tests render: one covered call, one naked put. */
import type { ModelAnalysisResponse, UnderlyingEntry } from '@/types/modelAnalysis'

export function buildUnderlyingEntry(over: Partial<UnderlyingEntry> = {}): UnderlyingEntry {
  return {
    symbol: 'NVDA',
    spot: 230.36,
    dte_days: 75,
    farthest_expiry: '2026-11-20',
    stock_qty: 500,
    stock_avg_cost: 118.2,
    max_gain: 12_120,
    max_loss: -110_060,
    risk_type: 'defined',
    breakeven_prices: [220.12],
    net_premium: 4_800,
    naked_short_call_contracts: 0,
    hedged_max_loss: null,
    max_gain_scenario: { underlying_price: 245, options_pnl: 4_800, stock_pnl: 7_320 },
    max_gain_sample_scenario: null,
    max_loss_scenario: { underlying_price: 0, options_pnl: 4_800, stock_pnl: -114_860 },
    capital_at_risk: {
      effective: 110_060,
      explain: 'covered_call',
      has_unbounded: false,
      leg_details: [{ strike: 245, right: 'C', qty: -5, car: 110_060, type: 'covered_call' }],
    },
    annualized_return_on_car: 0.53,
    annualized_static_return: 0.21,
    capital_committed: 115_180,
    covered_shares_modeled: 500,
    annualized_loss_on_car: null,
    greeks: {
      delta: 0.42,
      delta_dollars: 48_375,
      degraded: false,
      per_leg: [{ strike: 245, right: 'C', qty: -5, iv: 0.41, delta: -0.32 }],
    },
    stress: {
      available: true,
      iv_stress_available: true,
      scenarios: [
        { spot_shock: -0.1, iv_shock: 0, total_pnl: 44_600, pnl_change: -11_518 },
        { spot_shock: 0.1, iv_shock: 0, total_pnl: 60_100, pnl_change: 3_982 },
      ],
    },
    ...over,
  }
}

export function buildModelAnalysisResponse(over: Partial<ModelAnalysisResponse> = {}): ModelAnalysisResponse {
  return {
    account_id: 'U111',
    account_summary: { net_liquidation: 1_000_000, total_cash: 15_374.7, buying_power: 1_870_000 },
    per_underlying: [
      buildUnderlyingEntry(),
      buildUnderlyingEntry({
        symbol: 'DDOG',
        spot: 118.5,
        dte_days: 40,
        stock_qty: 0,
        stock_avg_cost: null,
        max_gain: 310,
        max_loss: -19_690,
        risk_type: 'undefined',
        net_premium: 310,
        capital_at_risk: { effective: 19_690, explain: 'short_put', has_unbounded: false },
        annualized_return_on_car: 0.14,
        greeks: { delta: 0.18, delta_dollars: 2_133, degraded: true, degraded_leg_count: 1 },
        stress: { available: false },
      }),
    ],
    account_rollups: {
      total_car: 129_750,
      car_has_unbounded: false,
      weighted_annualized_return: 0.47,
      total_delta: 0.6,
      total_delta_dollars: 50_508,
    },
    account_stress: {
      available: true,
      iv_stress_available: true,
      scenarios: [
        { spot_shock: -0.1, iv_shock: 0, total_pnl: 43_100, pnl_change: -12_900 },
        { spot_shock: 0.1, iv_shock: 0, total_pnl: 59_400, pnl_change: 3_400 },
      ],
    },
    disclaimer: 'Hypothetical figures from the model — not actual performance.',
    method: 'black_scholes',
    ...over,
  }
}
