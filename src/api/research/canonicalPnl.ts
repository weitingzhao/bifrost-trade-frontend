/**
 * Canonical structure PnL API client — Wave 13.
 *
 * Endpoints on Research API `:8795`:
 *   GET /research/canonical-pnl/trajectory
 *   GET /research/canonical-pnl/coverage
 *   GET /research/canonical-pnl/structures
 */
import { researchEngineUrl } from '@/lib/devApiUrl'

export type CanonicalStructure =
  | 'short_strangle'
  | 'put_credit_spread'
  | 'long_straddle'
  | 'covered_call'
  | 'short_put'

export const CANONICAL_STRUCTURES: { value: CanonicalStructure; label: string }[] = [
  { value: 'short_strangle', label: 'Short Strangle' },
  { value: 'put_credit_spread', label: 'Put Credit Spread' },
  { value: 'long_straddle', label: 'Long Straddle' },
  { value: 'covered_call', label: 'Covered Call' },
  { value: 'short_put', label: 'Short Put' },
]

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

interface Envelope<T> {
  ok: boolean
  data: T
  error?: string
}

async function unwrap<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => ({}))) as Envelope<T> & { detail?: string }
  if (!res.ok || body.ok === false) {
    const msg = body.error ?? body.detail ?? `HTTP ${res.status}`
    throw new Error(typeof msg === 'string' ? msg : `HTTP ${res.status}`)
  }
  return body.data
}

export async function fetchCanonicalStructures(): Promise<string[]> {
  const data = await unwrap<{ structures: string[] }>(
    await fetch(researchEngineUrl('/research/canonical-pnl/structures')),
  )
  return Array.isArray(data.structures) ? data.structures : []
}

export async function fetchCanonicalCoverage(): Promise<CanonicalCoverageResponse> {
  return unwrap<CanonicalCoverageResponse>(
    await fetch(researchEngineUrl('/research/canonical-pnl/coverage')),
  )
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
  return unwrap<CanonicalTrajectoryResponse>(
    await fetch(`${researchEngineUrl('/research/canonical-pnl/trajectory')}?${q}`),
  )
}

export async function refreshHypothesisTrajectory(
  hypothesisId: string,
  structure: string = 'short_strangle',
): Promise<{
  hypothesis: unknown
  symbol: string
  entry_date: string
  structure: string
  rows: CanonicalPnlRow[]
  count: number
  trajectory_summary: Record<string, unknown>
}> {
  const q = new URLSearchParams({ structure })
  return unwrap(
    await fetch(
      `${researchEngineUrl(`/research/hypothesis/${encodeURIComponent(hypothesisId)}/refresh-trajectory`)}?${q}`,
      { method: 'POST' },
    ),
  )
}
