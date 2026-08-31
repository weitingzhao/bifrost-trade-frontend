/**
 * Hypothesis workflow API (Wave RS-A).
 *
 * Talks to bifrost-research :8795 via the same `researchEngineUrl()` gateway
 * that Wave 4 endpoints use. Response envelope: `{ ok, data, error? }`.
 */
import { researchEngineUrl } from '@/lib/devApiUrl'
import { unwrapResearchEnvelope } from '@/lib/researchEnvelope'

export type HypothesisStatus = 'active' | 'validated' | 'rejected' | 'archived'

export interface Hypothesis {
  id: string
  title: string
  thesis: string
  symbols: string[]
  tags: string[]
  status: HypothesisStatus
  origin_page: string | null
  origin_ref: Record<string, unknown> | null
  linked_opportunity_ids: string[]
  linked_backtest_ids: string[]
  conclusion: string | null
  created_at: string
  updated_at: string
  retired_at: string | null
}

export interface HypothesisListResponse {
  rows: Hypothesis[]
  count: number
  limit: number
  offset: number
}

export interface HypothesisSummaryActive {
  counts: Record<HypothesisStatus, number>
  total_active: number
  recent_active: Hypothesis[]
}

export interface HypothesisCreateInput {
  title: string
  thesis: string
  symbols?: string[]
  tags?: string[]
  status?: HypothesisStatus
  origin_page?: string | null
  origin_ref?: Record<string, unknown> | null
  linked_opportunity_ids?: string[]
  linked_backtest_ids?: string[]
}

export interface HypothesisPatchInput {
  title?: string
  thesis?: string
  symbols?: string[]
  tags?: string[]
  status?: HypothesisStatus
  origin_page?: string | null
  origin_ref?: Record<string, unknown> | null
  linked_opportunity_ids?: string[]
  linked_backtest_ids?: string[]
  conclusion?: string | null
}

function unwrap<T>(res: Response): Promise<T> {
  return unwrapResearchEnvelope(res, { apiLabel: 'Hypothesis API' })
}

async function get<T>(path: string): Promise<T> {
  return unwrap<T>(await fetch(researchEngineUrl(path)))
}

async function send<T>(method: 'POST' | 'PATCH', path: string, body: unknown): Promise<T> {
  return unwrap<T>(
    await fetch(researchEngineUrl(path), {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  )
}

export interface ListHypothesesQuery {
  status?: HypothesisStatus
  symbol?: string
  tag?: string
  include_retired?: boolean
  limit?: number
  offset?: number
}

export function listHypotheses(opts: ListHypothesesQuery = {}): Promise<HypothesisListResponse> {
  const params = new URLSearchParams()
  if (opts.status) params.set('status', opts.status)
  if (opts.symbol) params.set('symbol', opts.symbol)
  if (opts.tag) params.set('tag', opts.tag)
  if (opts.include_retired) params.set('include_retired', 'true')
  if (opts.limit) params.set('limit', String(opts.limit))
  if (opts.offset) params.set('offset', String(opts.offset))
  const suffix = params.toString() ? `?${params.toString()}` : ''
  return get<HypothesisListResponse>(`/research/hypothesis${suffix}`)
}

export function getHypothesis(id: string): Promise<Hypothesis> {
  return get<Hypothesis>(`/research/hypothesis/${encodeURIComponent(id)}`)
}

export function fetchActiveSummary(topN = 5): Promise<HypothesisSummaryActive> {
  return get<HypothesisSummaryActive>(`/research/hypothesis/summary/active?top_n=${topN}`)
}

export function createHypothesis(body: HypothesisCreateInput): Promise<Hypothesis> {
  return send<Hypothesis>('POST', '/research/hypothesis', body)
}

export function patchHypothesis(id: string, body: HypothesisPatchInput): Promise<Hypothesis> {
  return send<Hypothesis>('PATCH', `/research/hypothesis/${encodeURIComponent(id)}`, body)
}

export function retireHypothesis(id: string): Promise<Hypothesis> {
  return send<Hypothesis>('POST', `/research/hypothesis/${encodeURIComponent(id)}/retire`, {})
}
