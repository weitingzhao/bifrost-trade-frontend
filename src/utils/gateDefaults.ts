import type { GateSafetyGates } from '@/types/positions'

export const DEFAULT_GATES: GateSafetyGates = {
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

export const DIM_TYPES = [
  'dim_direction',
  'dim_structure',
  'dim_coverage',
  'dim_risk',
  'dim_volatility',
  'dim_time',
] as const

export type DimFieldName = (typeof DIM_TYPES)[number]

export const DIM_LABELS: Record<DimFieldName, string> = {
  dim_direction: 'Direction',
  dim_structure: 'Structure',
  dim_coverage: 'Coverage',
  dim_risk: 'Risk',
  dim_volatility: 'Volatility',
  dim_time: 'Time',
}
