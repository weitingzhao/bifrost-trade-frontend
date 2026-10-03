/**
 * A complete gate set for tests — invented values in core's `GateParams`
 * shape. Runtime code never reads this: a new set is seeded from
 * `GET /gate-sets/defaults` (TD-72), so the UI holds no copy of
 * core's defaults that a core change could leave behind.
 */
import type { GateSetGates } from '@/types/strategy'

export const GATES_FIXTURE: GateSetGates = {
  strategy: {
    structure: { min_dte: 21, max_dte: 35, atm_band_pct: 0.03 },
    earnings: { blackout_days_before: 3, blackout_days_after: 1 },
    trading_hours_only: true,
  },
  state: {
    delta: { epsilon_band: 10, threshold_hedge_shares: 25, max_delta_limit: 500 },
    market: { vol_window_min: 5, stale_ts_threshold_ms: 5000 },
    liquidity: { wide_spread_pct: 0.1, extreme_spread_pct: 0.5 },
    system: { data_lag_threshold_ms: 1000 },
  },
  intent: {
    hedge: {
      min_hedge_shares: 10,
      cooldown_seconds: 60,
      max_hedge_shares_per_order: 500,
      min_price_move_pct: 0.2,
    },
  },
  guard: {
    risk: {
      max_daily_hedge_count: 50,
      max_position_shares: 2000,
      max_daily_loss_usd: 5000,
      max_net_delta_shares: 100,
      max_spread_pct: 0.05,
      paper_trade: true,
    },
  },
}

/** A fresh deep copy, so a test that edits it cannot leak into the next. */
export function gatesFixture(): GateSetGates {
  return JSON.parse(JSON.stringify(GATES_FIXTURE)) as GateSetGates
}
