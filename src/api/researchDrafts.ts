/**
 * Research AI draft inbox API (Wave RS-E3).
 *
 * Talks to bifrost-research :8795 via researchEngineUrl().
 * Envelope: `{ ok, data, error? }`.
 */
import { researchEngineUrl } from '@/lib/devApiUrl'
import { getResearchAuthHeaders } from '@/lib/auth/researchUser'
import { withValidation } from '@/lib/apiValidation'
import {
  DraftListResponseSchema,
} from '@/lib/schemas/research'
import { requestJson } from '@/lib/http'

/**
 * Every kind the backend will accept, mirroring `repositories/ai_draft`'s
 * `_ALLOWED_KINDS`. The last three were missing here while the Decision Inbox
 * was already showing them — sixty decision_draft rows and fourteen
 * order_intent rows exist. Nothing broke, because the Inbox denies by kind
 * rather than allowing by kind, but a switch written against this union would
 * have looked exhaustive and silently dropped them.
 */
export type DraftKind =
  | 'morning_brief'
  | 'eod_verdict'
  | 'daily_digest'
  | 'hypothesis_suggestion'
  | 'playbook_rule'
  | 'playbook_note'
  | 'candidate_batch'
  | 'hypothesis_draft'
  | 'decision_draft'
  | 'order_intent'
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

/** Every drafts route: the research bearer and the `{ ok, data }` envelope. */
function draftsApi<T>(path: string, body?: unknown): Promise<T> {
  return requestJson<T>(researchEngineUrl(path), {
    method: body === undefined ? 'GET' : 'POST',
    body,
    headers: getResearchAuthHeaders(),
    envelope: 'research',
    label: 'Drafts API',
  })
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
    await draftsApi(`/research/drafts${suffix}`),
  )
}

export async function approveResearchDraft(
  id: string,
  approvedBy = 'owner',
): Promise<{ draft: AiDraft; executed?: Record<string, unknown> }> {
  return draftsApi(`/research/drafts/${encodeURIComponent(id)}/approve`, { approved_by: approvedBy })
}

export async function dismissResearchDraft(
  id: string,
  approvedBy = 'owner',
): Promise<{ draft: AiDraft }> {
  return draftsApi(`/research/drafts/${encodeURIComponent(id)}/dismiss`, { approved_by: approvedBy })
}

/** The subset a person may create by hand — deliberately narrower than DraftKind. */
export type ManualDraftKind = Extract<
  DraftKind,
  'hypothesis_suggestion' | 'morning_brief' | 'eod_verdict'
>

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
  return draftsApi('/research/drafts', body)
}

export async function runMorningAgent(dryRun = false): Promise<AgentRunResult> {
  return draftsApi('/research/agents/morning/run', { dry_run: dryRun })
}

export async function runEodAgent(dryRun = false): Promise<AgentRunResult> {
  return draftsApi('/research/agents/eod/run', { dry_run: dryRun })
}
