/**
 * Event-driven backtest API (Wave RS-C4).
 *
 * Talks to `bifrost-research` :8795 via `researchEngineUrl()`.
 * Response envelope: `{ ok, data, error? }`.
 */
import { researchEngineUrl } from '@/lib/devApiUrl'
import { unwrapResearchEnvelope } from '@/lib/researchEnvelope'

export type EventKind =
  | 'earnings'
  | 'opex'
  | 'sepa_hit'
  | 'iv_percentile_threshold'
  | 'sql'

export interface EventDef {
  kind: EventKind
  params: Record<string, unknown>
}

export interface FillConfig {
  slippage_pct_of_spread: number
  commission_per_contract: number
  multiplier: number
  exercise_style: 'american_no_early' | 'european'
}

export interface LegPricing {
  label: string
  kind: 'option' | 'stock'
  side: 'buy' | 'sell'
  quantity: number
  entry_date: string
  exit_date: string
  entry_price: number
  exit_price: number
  strike: number | null
  expiry: string | null
  option_right: 'C' | 'P' | null
  pnl: number
  contract_multiplier: number
  fill_details?: Record<string, unknown>
}

export interface EventRun {
  event_date: string
  symbol: string
  entry_ts: string
  exit_ts: string
  pnl: number
  mfe: number
  mae: number
  legs: LegPricing[]
  notes?: string
}

export interface BacktestSummary {
  n_events: number
  win_rate: number
  avg_pnl: number
  median_pnl: number
  sharpe_annual: number
  max_drawdown: number
  avg_mfe?: number
  avg_mae?: number
}

export interface BacktestRunRow {
  id: string
  hypothesis_id: string | null
  event_def: EventDef
  strategy_template: string
  fill_config: FillConfig
  lookback_years: number
  summary: BacktestSummary
  walk_forward: unknown | null
  benchmark: unknown | null
  created_at: string
  persisted?: boolean
  error?: string
}

export interface EventQueryInput {
  event_def: EventDef
  strategy_template: string
  fill_config?: FillConfig | null
  lookback_years?: number
  hypothesis_id?: string | null
  include_walk_forward?: boolean
  include_benchmark?: boolean
  template_kwargs?: Record<string, unknown>
}

export interface EventQueryResponse {
  run_id: string | null
  run: BacktestRunRow
  summary: BacktestSummary
  runs: EventRun[]
  event_source: string | null
  event_source_notes: string | null
  skipped_events: number
  walk_forward: unknown | null
  benchmark: unknown | null
  advisory: string
}

function unwrap<T>(res: Response): Promise<T> {
  return unwrapResearchEnvelope(res, { apiLabel: 'Backtest event API' })
}

export async function postEventQuery(input: EventQueryInput): Promise<EventQueryResponse> {
  return unwrap<EventQueryResponse>(
    await fetch(researchEngineUrl('/research/backtest/event-query'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }),
  )
}

export interface ListBacktestRunsQuery {
  hypothesis_id?: string
  limit?: number
  offset?: number
}

export interface ListBacktestRunsResponse {
  rows: BacktestRunRow[]
  count: number
  limit: number
  offset: number
  hypothesis_id: string | null
}

export async function fetchBacktestRuns(
  opts: ListBacktestRunsQuery = {},
): Promise<ListBacktestRunsResponse> {
  const params = new URLSearchParams()
  if (opts.hypothesis_id) params.set('hypothesis_id', opts.hypothesis_id)
  if (opts.limit) params.set('limit', String(opts.limit))
  if (opts.offset) params.set('offset', String(opts.offset))
  const suffix = params.toString() ? `?${params.toString()}` : ''
  return unwrap<ListBacktestRunsResponse>(
    await fetch(researchEngineUrl(`/research/backtest/runs${suffix}`)),
  )
}

export interface GetBacktestRunResponse {
  row: BacktestRunRow
}

export async function fetchBacktestRun(runId: string): Promise<GetBacktestRunResponse> {
  return unwrap<GetBacktestRunResponse>(
    await fetch(researchEngineUrl(`/research/backtest/run/${encodeURIComponent(runId)}`)),
  )
}
