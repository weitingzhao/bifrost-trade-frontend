/**
 * Candidate outcome — what happened after the Loop proposed a symbol.
 *
 * Talks to `bifrost-research` Research API `:8795` via `researchEngineUrl()`.
 */
import { withValidation } from '@/lib/apiValidation'
import { researchEngineUrl } from '@/lib/devApiUrl'
import { requestJson } from '@/lib/http'
import { getResearchAuthHeaders } from '@/lib/auth/researchUser'
import {
  CandidateOutcomeRowsSchema,
  CandidateOutcomeSummarySchema,
} from '@/lib/schemas/research'

export interface CandidateOutcomeHorizon {
  horizon_days: number
  settled: number
  judged: number
  hits: number
  /** null = nothing settled yet, which is not a 0% hit rate. */
  hit_rate: number | null
  avg_return: number | null
  avg_benchmark: number | null
  avg_excess: number | null
}

export interface CandidateOutcomeRegimeSlice {
  regime: string | null
  horizon_days: number
  settled: number
  judged: number
  hits: number
  /** null = nothing judged in this regime, which is not a 0% hit rate. */
  hit_rate: number | null
  avg_excess: number | null
}

export interface CandidateOutcomeSummary {
  source: string | null
  days: number
  candidates: number
  pending: number
  horizons: CandidateOutcomeHorizon[]
  /** Present when the summary was asked with `by_regime=true`. */
  by_regime?: CandidateOutcomeRegimeSlice[]
}

export interface CandidateOutcomeRow {
  candidate_id: string
  symbol: string
  trade_date: string | null
  horizon_days: number
  entry_close: number | null
  exit_close: number | null
  exit_date: string | null
  forward_return: number | null
  benchmark_symbol: string | null
  benchmark_return: number | null
  excess_return: number | null
  hit: boolean | null
  source: string | null
  regime?: string | null
  regime_scope?: string | null
  regime_date?: string | null
}

const validateSummary = withValidation<CandidateOutcomeSummary>(
  CandidateOutcomeSummarySchema,
  'research/candidate-outcome/summary',
)
const validateRows = withValidation<{ rows: CandidateOutcomeRow[]; count: number }>(
  CandidateOutcomeRowsSchema,
  'research/candidate-outcome/rows',
)

export async function fetchCandidateOutcomeSummary(
  params: { source?: string; days?: number; byRegime?: boolean } = {},
): Promise<CandidateOutcomeSummary> {
  const q = new URLSearchParams()
  if (params.source) q.set('source', params.source)
  if (params.days != null) q.set('days', String(params.days))
  if (params.byRegime) q.set('by_regime', 'true')
  const qs = q.toString()
  const data = await requestJson<CandidateOutcomeSummary>(
    `${researchEngineUrl('/research/candidate-outcome/summary')}${qs ? `?${qs}` : ''}`,
    { headers: getResearchAuthHeaders(), envelope: 'research' },
  )
  return validateSummary(data)
}

export async function fetchCandidateOutcomeRows(
  params: {
    symbol?: string
    horizonDays?: number
    /** Empty string is every source — the same as omitting it. */
    source?: string
    days?: number
    limit?: number
  } = {},
): Promise<{ rows: CandidateOutcomeRow[]; count: number }> {
  const q = new URLSearchParams()
  if (params.symbol) q.set('symbol', params.symbol)
  if (params.horizonDays != null) q.set('horizon_days', String(params.horizonDays))
  if (params.source != null) q.set('source', params.source)
  if (params.days != null) q.set('days', String(params.days))
  if (params.limit != null) q.set('limit', String(params.limit))
  const qs = q.toString()
  const data = await requestJson<{ rows: CandidateOutcomeRow[]; count: number }>(
    `${researchEngineUrl('/research/candidate-outcome/rows')}${qs ? `?${qs}` : ''}`,
    { headers: getResearchAuthHeaders(), envelope: 'research' },
  )
  return validateRows(data)
}
