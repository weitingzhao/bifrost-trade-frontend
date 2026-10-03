/**
 * Feedback (K5 — trade-api /research/feedback/*, store ops_feedback.*).
 *
 * Installation-keyed (§20.5: reports are the system's), so no research bearer
 * here — the same anonymous reach every trade-api research route has. This
 * router family answers {ok, ...} with error inline rather than by status.
 */
import { z } from 'zod'
import { tradeResearchUrl } from '@/lib/devApiUrl'
import { withValidation } from '@/lib/apiValidation'
import { requestJson, type RequestJsonOptions } from '@/lib/http'

export const FEEDBACK_KINDS = ['bug', 'data', 'idea', 'howto'] as const
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number]

export const FEEDBACK_STATUSES = [
  'new',
  'triaged',
  'progress',
  'fixed',
  'answered',
  'wontfix',
] as const
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number]

export const OPEN_STATUSES: readonly FeedbackStatus[] = ['new', 'triaged', 'progress']

export interface FeedbackReport {
  id: string
  report_id: number
  kind: FeedbackKind
  title: string
  body_md: string
  page_route: string
  page_label: string
  blocks_trading: boolean
  context: Record<string, unknown>
  status: FeedbackStatus
  reply_md: string | null
  replied_at: string | null
  unread_reply: boolean
  images: number
  created_at: string | null
  updated_at: string | null
}

const EnvelopeSchema = z
  .object({ ok: z.boolean(), error: z.string().nullish() })
  .passthrough()

const validateFeedback = withValidation<{ ok: boolean; error?: string | null }>(
  EnvelopeSchema,
  'research/feedback',
)

/** `ok: false` throws with the store's `error` inside `requestJson`. */
async function call<T>(path: string, init: RequestJsonOptions<T> = {}): Promise<T> {
  return validateFeedback(await requestJson(tradeResearchUrl(path), { ...init, label: 'feedback' })) as {
    ok: boolean
    error?: string | null
  } & T
}

export interface FeedbackSubmit {
  kind: FeedbackKind
  title: string
  body_md?: string
  page_route?: string
  page_label?: string
  blocks_trading?: boolean
  context?: Record<string, unknown>
  images?: { mime: string; data_b64: string }[]
}

export function submitFeedback(input: FeedbackSubmit): Promise<{ report: FeedbackReport }> {
  return call('/research/feedback/reports', { method: 'POST', body: input })
}

export function fetchFeedbackReports(
  scope: 'all' | 'open' | 'closed' = 'all',
): Promise<{ reports: FeedbackReport[]; count: number }> {
  return call(`/research/feedback/reports?scope=${scope}`)
}

export interface FeedbackSummary {
  open: number
  unread: number
  waiting: number
  blocking: number
}

export function fetchFeedbackSummary(): Promise<FeedbackSummary> {
  return call('/research/feedback/summary')
}

export function markFeedbackRead(id: string): Promise<{ report: FeedbackReport }> {
  return call(`/research/feedback/reports/${encodeURIComponent(id)}/read`, { method: 'POST' })
}

export function setFeedbackStatus(
  id: string,
  status: FeedbackStatus,
): Promise<{ report: FeedbackReport }> {
  return call(`/research/feedback/reports/${encodeURIComponent(id)}/status`, {
    method: 'POST',
    body: { status },
  })
}

export function replyFeedback(id: string, reply_md: string): Promise<{ report: FeedbackReport }> {
  return call(`/research/feedback/reports/${encodeURIComponent(id)}/reply`, {
    method: 'POST',
    body: { reply_md },
  })
}

export function feedbackImageUrl(id: string, seq: number): string {
  return tradeResearchUrl(`/research/feedback/reports/${encodeURIComponent(id)}/images/${seq}`)
}
