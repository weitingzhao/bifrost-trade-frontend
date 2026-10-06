/**
 * Option position simulator API (research 0.170.0).
 *
 * `POST /research/backtest/sim` replays one seller structure bar by bar over a
 * window — open on a schedule, manage daily (profit take, stop, DTE exit,
 * stale quotes), settle at intrinsic. Runs persist as `research.backtest_run`
 * rows with `strategy_template = 'sim:<structure>'`; their trades and equity
 * curve come back from `GET /research/backtest/sim/{run_id}/detail`.
 * Historical only (D10).
 */
import { researchEngineUrl } from '@/lib/devApiUrl'
import { requestJson } from '@/lib/http'
import { getResearchAuthHeaders } from '@/lib/auth/researchUser'
import { withValidation } from '@/lib/apiValidation'
import { SimDetailSchema, SimResponseSchema } from '@/lib/schemas/researchData'
import type { BacktestRunRow } from '@/api/research/backtestEvent'

export type SimStructure = 'short_put' | 'put_credit_spread' | 'short_strangle' | 'iron_condor'

export interface SimEntryEvent {
  kind: 'earnings' | 'opex' | 'sepa_hit' | 'iv_percentile_threshold' | 'indicator_signal' | 'pine_signal'
  params?: Record<string, unknown>
}

export interface SimInput {
  symbols: string[]
  start?: string
  end?: string
  structure: SimStructure
  target_dte?: number
  short_delta?: number
  wing_width_pct?: number
  quantity?: number
  entry_every_sessions?: number
  /** An event in place of the schedule (research 0.171.0; `indicator_signal` from W6). */
  entry_event?: SimEntryEvent | null
  /** Sessions from the event to the entry; +1 enters on the close after the signal session. */
  entry_offset_sessions?: number
  max_open_per_symbol?: number
  profit_take_pct?: number | null
  stop_loss_mult?: number | null
  dte_exit?: number | null
  price_field?: 'vwap' | 'close'
  slippage_scale?: number
  persist?: boolean
  hypothesis_id?: string | null
}

export interface SimSummary {
  n_trades: number
  win_rate: number
  total_pnl: number
  avg_pnl: number
  median_pnl: number
  /** Bootstrap 95% interval of the mean trade; null below a handful of trades. */
  avg_pnl_ci95: [number, number] | null
  avg_credit: number
  avg_days_held: number
  worst_trade: number
  exit_reasons: Record<string, number>
  max_drawdown: number
  max_drawdown_pct: number | null
  sharpe_annual: number
  peak_margin: number
  return_on_peak_margin: number | null
  sample_note: 'noise' | 'thin' | 'ok'
  fill_basis: string
  rule_timing?: string
  skipped_entries?: Record<string, number>
}

export interface SimLeg {
  label: string
  ticker: string
  right: 'C' | 'P'
  side: 'buy' | 'sell'
  strike: number
  expiry: string
  qty: number
  entry_fill: number
  exit_fill: number
  entry_iv: number | null
  entry_delta: number | null
}

export interface SimTrade {
  seq: number
  symbol: string
  structure: string
  entry_date: string
  exit_date: string
  exit_reason: string
  legs: SimLeg[]
  entry_credit: number
  exit_debit: number
  pnl: number
  max_loss: number | null
  margin: number
  days_held: number
  mfe: number
  mae: number
  fill_basis: string
}

export interface SimEquityPoint {
  as_of: string
  equity: number
  margin_used: number
  open_positions: number
}

export interface SimResponse {
  run_id: string | null
  run: Partial<BacktestRunRow> & { persisted?: boolean; error?: string }
  summary: SimSummary
  trades: SimTrade[]
  equity: SimEquityPoint[]
  params: Record<string, unknown>
  advisory: string
}

export interface SimDetail {
  row: BacktestRunRow
  trades: SimTrade[]
  equity: SimEquityPoint[]
}

const validateSim = withValidation<SimResponse>(SimResponseSchema, 'research/backtest/sim')
const validateDetail = withValidation<SimDetail>(SimDetailSchema, 'research/backtest/sim/detail')

function simApi<T>(path: string, body?: unknown): Promise<T> {
  return requestJson<T>(researchEngineUrl(path), {
    method: body === undefined ? 'GET' : 'POST',
    body,
    headers: getResearchAuthHeaders(),
    envelope: 'research',
    label: 'Backtest simulator API',
  })
}

export async function postSim(input: SimInput): Promise<SimResponse> {
  return validateSim(await simApi('/research/backtest/sim', input))
}

export async function fetchSimDetail(runId: string): Promise<SimDetail> {
  return validateDetail(await simApi(`/research/backtest/sim/${encodeURIComponent(runId)}/detail`))
}
