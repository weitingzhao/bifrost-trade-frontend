/**
 * Canonical structure PnL API client — Wave 13.
 *
 * Endpoints on Research API `:8795`:
 *   GET /research/canonical-pnl/trajectory
 *   POST /research/hypothesis/{id}/refresh-trajectory
 */
import { researchEngineUrl } from '@/lib/devApiUrl'
import { requestJson } from '@/lib/http'
import { withValidation } from '@/lib/apiValidation'
import { CanonicalTrajectoryResponseSchema } from '@/lib/schemas/researchData'

const validateTrajectory = withValidation<CanonicalTrajectoryResponse>(
  CanonicalTrajectoryResponseSchema,
  'research/canonical-pnl/trajectory',
)


export type CanonicalStructure =
  | 'short_strangle'
  | 'put_credit_spread'
  | 'long_straddle'
  | 'covered_call'
  | 'short_put'

export interface CanonicalPnlRow {
  as_of_date: string
  entry_date: string
  symbol: string
  structure: string
  params_hash: string | null
  structure_params: unknown
  entry_spot: number | null
  entry_atm_iv: number | null
  entry_mid: number | null
  as_of_spot: number | null
  as_of_atm_iv: number | null
  mtm_value: number | null
  pnl_since_entry: number | null
  dte_remaining: number | null
  expired: boolean | null
  final_pnl: number | null
  data_quality: string | null
}

export interface CanonicalTrajectoryResponse {
  symbol: string
  entry_date: string
  structure: string
  rows: CanonicalPnlRow[]
  count: number
}

export interface CanonicalCoverageResponse {
  symbols: number
  entry_dates: number
  rows: number
  by_quality: Record<string, number>
  insufficient_pct: number | null
  mart_table?: string
  features_table?: string
}

export async function fetchCanonicalTrajectory(opts: {
  symbol: string
  entryDate: string
  structure?: CanonicalStructure | string
  paramsHash?: string
}): Promise<CanonicalTrajectoryResponse> {
  const q = new URLSearchParams({
    symbol: opts.symbol.trim().toUpperCase(),
    entry_date: opts.entryDate.slice(0, 10),
    structure: opts.structure ?? 'short_strangle',
  })
  if (opts.paramsHash) q.set('params_hash', opts.paramsHash)
  return validateTrajectory(
    await requestJson<unknown>(`${researchEngineUrl('/research/canonical-pnl/trajectory')}?${q}`, {
      envelope: 'research',
    }),
  )
}

interface RefreshTrajectoryResult {
  hypothesis: unknown
  symbol: string
  entry_date: string
  structure: string
  rows: CanonicalPnlRow[]
  count: number
  trajectory_summary: Record<string, unknown>
}

export async function refreshHypothesisTrajectory(
  hypothesisId: string,
  structure: string = 'short_strangle',
): Promise<RefreshTrajectoryResult> {
  const q = new URLSearchParams({ structure })
  return requestJson<RefreshTrajectoryResult>(
    `${researchEngineUrl(`/research/hypothesis/${encodeURIComponent(hypothesisId)}/refresh-trajectory`)}?${q}`,
    { method: 'POST', envelope: 'research' },
  )
}
