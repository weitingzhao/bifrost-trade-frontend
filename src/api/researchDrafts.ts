/**
 * Research AI draft inbox API (Wave RS-E3).
 *
 * Talks to bifrost-research :8795 via researchEngineUrl().
 * Envelope: `{ ok, data, error? }`.
 */
import { researchEngineUrl } from '@/lib/devApiUrl'
import { getResearchAuthHeaders } from '@/lib/auth/researchUser'
import { withValidation } from '@/lib/apiValidation'
import { DraftListResponseSchema } from '@/lib/schemas/research'

export type DraftKind =
  | 'morning_brief'
  | 'eod_verdict'
  | 'hypothesis_suggestion'
  | 'playbook_rule'
  | 'playbook_note'
  | 'candidate_batch'
  | 'policy_suggestion'
export type DraftStatus = 'pending' | 'approved' | 'dismissed' | 'expired'

export interface AiDraft {
  id: string
  kind: DraftKind
  payload: Record<string, unknown>
  scope: string
  status: DraftStatus
  generated_by: string
  linked_action_id: string | null
  created_at: string
  expires_at: string | null
}

export interface DraftListResponse {
  rows: AiDraft[]
  count: number
  pending_count: number
  limit: number
  offset: number
}

export interface AgentRunResult {
  ok?: boolean
  dry_run?: boolean
  count?: number
  draft_ids?: string[]
  drafts?: unknown[]
  active_hypotheses?: number
  message?: string
}

interface Envelope<T> {
  ok: boolean
  data: T
  error?: string
}

async function unwrap<T>(res: Response): Promise<T> {
  const ct = res.headers.get('content-type') ?? ''
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    if (text.trimStart().startsWith('<!') || ct.includes('text/html')) {
      throw new Error(
        'Drafts API unreachable (got HTML). Ensure research-api :8795 is running.',
      )
    }
    throw new Error(`Drafts API ${res.status}: ${text}`)
  }
  const body = (await res.json()) as Envelope<T>
  if (!body.ok) {
    throw new Error(body.error ?? 'Drafts API returned ok=false')
  }
  return body.data
}

/** Feeds InboxBanner — pending_count decides whether the banner renders at all. */
const validateDraftList = withValidation<DraftListResponse>(
  DraftListResponseSchema,
  'research/drafts',
)

export async function listResearchDrafts(params?: {
  status?: DraftStatus | null
  kind?: DraftKind
  limit?: number
}): Promise<DraftListResponse> {
  const qs = new URLSearchParams()
  if (params?.status) qs.set('status', params.status)
  else if (params?.status === null) {
    /* omit — backend defaults pending */
  } else {
    qs.set('status', 'pending')
  }
  if (params?.kind) qs.set('kind', params.kind)
  if (params?.limit) qs.set('limit', String(params.limit))
  const suffix = qs.toString() ? `?${qs}` : ''
  return validateDraftList(
    await unwrap(
      await fetch(researchEngineUrl(`/research/drafts${suffix}`), {
        headers: getResearchAuthHeaders(),
      }),
    ),
  )
}

export async function approveResearchDraft(
  id: string,
  approvedBy = 'owner',
): Promise<{ draft: AiDraft; executed?: Record<string, unknown> }> {
  return unwrap(
    await fetch(researchEngineUrl(`/research/drafts/${encodeURIComponent(id)}/approve`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getResearchAuthHeaders() },
      body: JSON.stringify({ approved_by: approvedBy }),
    }),
  )
}

export async function dismissResearchDraft(
  id: string,
  approvedBy = 'owner',
): Promise<{ draft: AiDraft }> {
  return unwrap(
    await fetch(researchEngineUrl(`/research/drafts/${encodeURIComponent(id)}/dismiss`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getResearchAuthHeaders() },
      body: JSON.stringify({ approved_by: approvedBy }),
    }),
  )
}

export type ManualDraftKind = 'hypothesis_suggestion' | 'morning_brief' | 'eod_verdict'

export interface CreateResearchDraftBody {
  kind: ManualDraftKind
  title: string
  summary: string
  hypothesis_id?: string
  symbols?: string[]
}

export async function createResearchDraft(
  body: CreateResearchDraftBody,
): Promise<{ draft: AiDraft }> {
  return unwrap(
    await fetch(researchEngineUrl('/research/drafts'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getResearchAuthHeaders() },
      body: JSON.stringify(body),
    }),
  )
}

export async function runMorningAgent(dryRun = false): Promise<AgentRunResult> {
  return unwrap(
    await fetch(researchEngineUrl('/research/agents/morning/run'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getResearchAuthHeaders() },
      body: JSON.stringify({ dry_run: dryRun }),
    }),
  )
}

export async function runEodAgent(dryRun = false): Promise<AgentRunResult> {
  return unwrap(
    await fetch(researchEngineUrl('/research/agents/eod/run'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getResearchAuthHeaders() },
      body: JSON.stringify({ dry_run: dryRun }),
    }),
  )
}
