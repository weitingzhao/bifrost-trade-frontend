/**
 * Similar-regime + Signal Health API clients — Wave 14.
 */
import { researchEngineUrl } from '@/lib/devApiUrl'
import { unwrapResearchEnvelope as unwrap } from '@/lib/researchEnvelope'

export type SimilarRegimeLens =
  | 'vrp'
  | 'iv_rank'
  | 'term_slope'
  | 'pin_distance'
  | 'gex_notional'
  | 'regime'

export interface SimilarRegimeRow {
  trade_date: string
  symbol: string
  lens_value?: number | string | null
  distance?: number | null
  fwd_return?: number | null
  vrp_pct_252d?: number | null
  vrp_60d?: number | null
  atm_iv_30d?: number | null
  rv_60d?: number | null
  iv_rank_1y?: number | null
  iv_percentile_1y?: number | null
  iv_current?: number | null
  gex_notional?: number | null
  zero_gamma?: number | null
  spot?: number | null
  regime?: string | null
}

export interface SimilarRegimeResponse {
  lens: SimilarRegimeLens
  symbol: string
  value: number | string
  horizon: number
  k: number
  source: string
  rows: SimilarRegimeRow[]
  count: number
}

export async function fetchSimilarRegime(opts: {
  lens: SimilarRegimeLens
  symbol: string
  value: number | string
  horizon?: number
  k?: number
}): Promise<SimilarRegimeResponse> {
  const q = new URLSearchParams({
    lens: opts.lens,
    symbol: opts.symbol.trim().toUpperCase(),
    value: String(opts.value),
    horizon: String(opts.horizon ?? 5),
    k: String(opts.k ?? 5),
  })
  return unwrap(await fetch(`${researchEngineUrl('/research/similar-regime')}?${q}`))
}

export interface SignalFreshnessItem {
  label: string
  table: string
  max_computed_at: string | null
  row_count: number
  status: string
  age_hours: number | null
  error?: string
}

export interface SignalHealthResponse {
  overall: string
  as_of: string
  freshness: SignalFreshnessItem[]
  extra_tables: SignalFreshnessItem[]
  hypotheses: {
    counts: Record<string, number>
    total_active: number
    total: number
    error?: string
  }
  canonical_pnl: {
    insufficient_pct: number | null
    rows?: number
    symbols?: number
    by_quality?: Record<string, number>
    error?: string
  }
  iv_reconstruction?: {
    rows?: number
    symbols?: number
    distinct_dates?: number
    with_iv?: number
    by_status?: Record<string, number>
    solver_ok_pct?: number | null
    error?: string
  }
}

export async function fetchSignalHealth(): Promise<SignalHealthResponse> {
  return unwrap(await fetch(researchEngineUrl('/research/signal-health')))
}
