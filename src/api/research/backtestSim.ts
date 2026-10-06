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

export type SimStructure = 'short_put' | 'put_credit_spread' | 'call_credit_spread' | 'short_strangle' | 'iron_condor'

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
  /**
   * Pine exit (research 0.178.0, pine_signal entries only): the script's own
   * exit — its strategy() close, or the opposite plot — closes a position the
   * session after it is known, unless expiry or a premium rule comes first.
   */
  pine_exit?: PineExitMode | null
  /** Short strike at the first listed strike beyond a Pine plot's level (0.178.0), inside |Δ| rails. */
  strike_anchor?: SimStrikeAnchor | null
  persist?: boolean
  hypothesis_id?: string | null
}

export type PineExitMode = 'auto' | 'strategy' | 'reverse_plot'

export interface SimStrikeAnchor {
  plot: string
  min_delta?: number
  max_delta?: number
}

/** The headline readings both sides of a Pine-exit run carry (a subset of `SimSummary`). */
export interface PineExitSide {
  n_trades: number
  win_rate: number
  total_pnl: number
  avg_pnl: number
  median_pnl?: number
  avg_pnl_ci95?: [number, number] | null
  avg_days_held?: number
  worst_trade?: number
  max_drawdown?: number
  sharpe_annual?: number
  return_on_peak_margin?: number | null
  exit_reasons?: Record<string, number>
  skipped_entries?: Record<string, number>
}

/**
 * A Pine-exit run next to the same run managed by premium rules only (research
 * 0.178.0): same signals, same strike rule. `paired` is over the entries both
 * opened — P&L with the Pine exit minus without.
 */
export interface PineExitComparison {
  premium_only: PineExitSide
  with_pine_exit: PineExitSide
  delta: Partial<Record<'n_trades' | 'win_rate' | 'total_pnl' | 'avg_pnl' | 'avg_days_held' | 'max_drawdown' | 'sharpe_annual', number>>
  paired: {
    n: number
    exits_changed: number
    avg_pnl_diff: number | null
    avg_pnl_diff_ci95: [number, number] | null
    only_premium_only: number
    only_with_pine_exit: number
  }
  note?: string
}

/** What the run asked the pine-runner (research 0.178.0). */
export interface SimPineReport {
  script: string
  script_version?: number
  exit_mode?: PineExitMode | null
  exit_mode_used?: string | string[] | null
  anchor_plot?: string | null
  per_symbol?: Record<string, { exits_long: number; exits_short: number; level_sessions: number }>
  errors?: Record<string, string>
  warnings?: Record<string, Array<{ code: string; message?: string }>>
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
  /**
   * Entry timing basis (research 0.175.0+). Absent = v1, where a signal entry's
   * offset 0 was the signal's own session (filled before the signal was known).
   */
  entry_timing?: { version: number; anchor: string; fill?: string; note?: string }
  /** Present on a run with `pine_exit` (research 0.178.0). */
  pine_exit_comparison?: PineExitComparison
  /** Present on a run with `pine_exit` or `strike_anchor` (research 0.178.0). */
  pine?: SimPineReport
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
  /** The Pine level the strike was placed against (research 0.178.0, `strike_anchor`). */
  anchor_level?: number
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
  /** The session the Pine exit was due, or null when none came before the end (runs with `pine_exit`). */
  pine_exit_on?: string | null
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

/**
 * Signal-entry timing became next-session in research 0.175.0 (method v2):
 * `entry_offset_sessions` 0 = the first session after the signal. Before it,
 * 0 was the signal's own session and 1 the next.
 */
export const SIM_ENTRY_V2_VERSION = '0.175.0'

/** `a >= b` for dotted numeric versions; an unreadable version is not at least anything. */
export function versionAtLeast(a: string | null | undefined, b: string): boolean {
  if (!a) return false
  const pa = a.split('.').map((x) => Number.parseInt(x, 10))
  const pb = b.split('.').map((x) => Number.parseInt(x, 10))
  if (pa.some((x) => !Number.isFinite(x))) return false
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (d !== 0) return d > 0
  }
  return true
}

/**
 * The request's `entry_offset_sessions` for "enter N sessions after the
 * signal" (N ≥ 1; 1 = the next session). v2 counts from the next session, v1
 * from the signal's own, so the same N is one less on v2.
 */
export function entryOffsetFor(sessionsAfter: number, v2: boolean): number {
  const n = Math.max(1, Math.round(sessionsAfter))
  return v2 ? n - 1 : n
}

/** A stored signal run's offset, as sessions after the signal (inverse of `entryOffsetFor`). */
export function sessionsAfterOf(offset: number, v2: boolean): number {
  return v2 ? offset + 1 : offset
}
