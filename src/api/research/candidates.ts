/**
 * Candidate Pool API — Research Loop v1.
 *
 * Talks to bifrost-research :8795 via researchEngineUrl().
 * Envelope: `{ ok, data, error? }`.
 */
import { researchEngineUrl } from '@/lib/devApiUrl'

export type CandidateStatus = 'open' | 'promoted' | 'dismissed' | 'expired'
export type CandidateSource =
  | 'scan'
  | 'screener'
  | 'event_radar'
  | 'momentum'
  | 'sepa'
  | 'copilot'
  | 'manual'
  | 'harness'

export interface ResearchCandidate {
  id: string
  trade_date: string
  symbol: string
  source: string
  source_ref: Record<string, unknown> | null
  score: number | null
  lens_snapshot: Record<string, unknown>
  tags: string[]
  status: CandidateStatus
  hypothesis_id: string | null
  owner_id: string
  created_at: string
  ttl_at: string | null
}

export interface CandidateListResponse {
  items: ResearchCandidate[]
  count: number
}

export interface CandidateCreateItem {
  symbol: string
  source?: string
  score?: number | null
  lens_snapshot?: Record<string, unknown>
  tags?: string[]
  source_ref?: Record<string, unknown>
}

export interface PromoteCandidateBody {
  title?: string
  thesis?: string
  tags?: string[]
}

export interface PromoteCandidateResult {
  candidate: ResearchCandidate
  hypothesis: unknown
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

export async function fetchCandidates(params?: {
  status?: string
  source?: string
  days?: number
}): Promise<CandidateListResponse> {
  const q = new URLSearchParams()
  if (params?.status === 'all') {
    // Empty status → backend skips status filter (lists all).
    q.set('status', '')
  } else if (params?.status) {
    q.set('status', params.status)
  }
  if (params?.source) q.set('source', params.source)
  if (params?.days != null) q.set('days', String(params.days))
  const qs = q.toString()
  return unwrap(
    await fetch(`${researchEngineUrl('/research/candidates')}${qs ? `?${qs}` : ''}`),
  )
}

export async function addCandidates(
  items: CandidateCreateItem[],
): Promise<CandidateListResponse> {
  return unwrap(
    await fetch(researchEngineUrl('/research/candidates'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    }),
  )
}

export async function promoteCandidate(
  id: string,
  body?: PromoteCandidateBody,
): Promise<PromoteCandidateResult> {
  return unwrap(
    await fetch(researchEngineUrl(`/research/candidates/${encodeURIComponent(id)}/promote`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    }),
  )
}

export async function dismissCandidate(id: string): Promise<ResearchCandidate> {
  return unwrap(
    await fetch(researchEngineUrl(`/research/candidates/${encodeURIComponent(id)}/dismiss`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }),
  )
}
