/**
 * Materialized Analyze scanner API — Wave D/H.
 */
import { researchEngineUrl } from '@/lib/devApiUrl'
import { unwrapResearchEnvelope as unwrap } from '@/lib/researchEnvelope'

export type ScanSortBy =
  | 'composite_score'
  | 'iv_rank_1y'
  | 'vrp_pct_252d'
  | 'atm_slope_30d'
  | 'pin_pct_distance'
  | 'pin_score'
  | 'tail_risk'
  | 'trend_release'
  | 'gex_notional'
  | 'zero_gamma_offset'
  | 'symbol'
  | 'close'

export type ScanLensFlag = 'hot' | 'cold' | 'neutral'
export type ScanFlagFilterValue = ScanLensFlag | 'all'
export type ScanPreset = 'neutral' | 'momentum' | 'mean_revert' | 'adaptive_30d'

export const SCAN_PRESET_WEIGHTS: Record<Exclude<ScanPreset, 'adaptive_30d'>, Record<string, number>> = {
  neutral: { iv_rank: 25, vrp: 25, atm_slope: 15, pin: 15, terrain: 20 },
  momentum: { iv_rank: 15, vrp: 15, atm_slope: 30, pin: 10, terrain: 30 },
  mean_revert: { iv_rank: 35, vrp: 30, atm_slope: 10, pin: 15, terrain: 10 },
}

export interface ScanRow {
  trade_date: string
  symbol: string
  close: number | null
  iv_rank_1y: number | null
  vrp_pct_252d: number | null
  atm_slope_30d: number | null
  pin_pct_distance: number | null
  dte_to_opex: number | null
  zero_gamma_offset: number | null
  gex_notional: number | null
  terrain_regime: string | null
  pin_score: number | null
  tail_risk: number | null
  trend_release: number | null
  composite_score: number | null
  lens_flags: Record<string, ScanLensFlag | string>
  composite_source?: string
  computed_at?: string | null
  fetched_at?: string | null
}

export interface ScanResponse {
  as_of: string | null
  count: number
  rows: ScanRow[]
  universe_size: number
  preset?: ScanPreset | string
  weights?: Record<string, number>
}

export interface ScanLensFilters {
  iv_rank?: ScanFlagFilterValue
  vrp?: ScanFlagFilterValue
  atm_slope?: ScanFlagFilterValue
  pin?: ScanFlagFilterValue
  terrain?: ScanFlagFilterValue
}

export interface FetchScanParams {
  symbols?: string[]
  asOf?: string
  sortBy?: ScanSortBy
  sortDir?: 'asc' | 'desc'
  minComposite?: number
  flagFilter?: string
  lensFilters?: ScanLensFilters
  preset?: ScanPreset
  limit?: number
  offset?: number
}

export async function fetchScan(params: FetchScanParams = {}): Promise<ScanResponse> {
  const q = new URLSearchParams()
  if (params.symbols?.length) q.set('symbols', params.symbols.join(','))
  if (params.asOf) q.set('as_of', params.asOf)
  if (params.sortBy) q.set('sort_by', params.sortBy)
  if (params.sortDir) q.set('sort_dir', params.sortDir)
  if (params.minComposite != null) q.set('min_composite', String(params.minComposite))
  if (params.flagFilter) q.set('flag_filter', params.flagFilter)
  if (params.preset) q.set('preset', params.preset)
  const lf = params.lensFilters
  if (lf) {
    for (const key of ['iv_rank', 'vrp', 'atm_slope', 'pin', 'terrain'] as const) {
      const v = lf[key]
      if (v && v !== 'all') q.set(key, v)
    }
  }
  if (params.limit != null) q.set('limit', String(params.limit))
  if (params.offset != null) q.set('offset', String(params.offset))
  const qs = q.toString()
  return unwrap(await fetch(`${researchEngineUrl('/research/scan')}${qs ? `?${qs}` : ''}`))
}
