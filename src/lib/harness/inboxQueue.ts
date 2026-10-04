/**
 * The Decision Inbox's read of the queue — one request per kind, put back
 * together here (pure, so the counts are testable without a network).
 *
 * Why per kind: the page used to read the newest 200 pending drafts of every
 * kind at once. On DEV (2026-10-04) 724 `eod_verdict` briefings filled that
 * page, so of the 144 drafts waiting for a call it saw 16, and "To decide"
 * counted those 16. Each decision kind fits in one page of its own; the
 * briefings are read page by page on their own.
 *
 * Reading by kind is an allowlist, and the Inbox has always denied by kind
 * rather than allowed by kind — a kind the UI does not model is exactly the
 * draft a reader most needs to see. So the server's own `pending_count` is
 * kept beside the sum, and a kind the page does not read shows up as the
 * difference instead of vanishing.
 */
import type { UseQueryResult } from '@tanstack/react-query'
import type { AiDraft, DraftKind, DraftListResponse } from '@/api/researchDrafts'

/** Kinds that ask for a call, read one request each. */
export const DECISION_QUEUE_KINDS: readonly DraftKind[] = [
  'decision_draft',
  'order_intent',
  'policy_suggestion',
  'candidate_batch',
  'playbook_note',
  'playbook_rule',
  'hypothesis_draft',
  'hypothesis_suggestion',
]

/** Kinds that only need reading. Same set as `BRIEFING_KINDS`. */
export const BRIEFING_QUEUE_KINDS: readonly DraftKind[] = ['eod_verdict', 'daily_digest', 'morning_brief']

export const INBOX_QUEUE_KINDS: readonly DraftKind[] = [...DECISION_QUEUE_KINDS, ...BRIEFING_QUEUE_KINDS]

export interface InboxQueue {
  /** Pending drafts that ask for a call, every kind, newest first. */
  decisions: AiDraft[]
  /** Pending briefings, newest first. */
  briefings: AiDraft[]
  /** Pending per kind, as listed. */
  byKind: Partial<Record<DraftKind, number>>
  /** The server's count of the whole pending queue, or null until a kind answers. */
  pendingCount: number | null
  /** Everything listed, summed over the kinds. */
  listed: number
  /** Pending on the server in kinds this page does not read. Zero when every kind is in. */
  unaccounted: number
  decisionsLoading: boolean
  briefingsLoading: boolean
  /** The first failed kind's error, decisions before briefings. */
  error: unknown
  /** Every kind answered: the sets are whole and may be used to prune stored ids. */
  complete: boolean
}

function byNewest(a: AiDraft, b: AiDraft): number {
  return b.created_at.localeCompare(a.created_at) || (a.id < b.id ? 1 : -1)
}

/**
 * The `combine` for `useQueries` over `INBOX_QUEUE_KINDS`, in that order.
 * Kept at module scope so its identity is stable and TanStack can memoise it.
 */
export function combineInboxQueue(results: readonly Pick<UseQueryResult<DraftListResponse>, 'data' | 'isLoading' | 'error'>[]): InboxQueue {
  const decisions: AiDraft[] = []
  const briefings: AiDraft[] = []
  const byKind: Partial<Record<DraftKind, number>> = {}
  let pendingCount: number | null = null
  let decisionsLoading = false
  let briefingsLoading = false
  let decisionError: unknown = null
  let briefingError: unknown = null
  let complete = true
  INBOX_QUEUE_KINDS.forEach((kind, i) => {
    const r = results[i]
    const isBriefing = BRIEFING_QUEUE_KINDS.includes(kind)
    if (!r?.data) {
      complete = false
      if (r?.isLoading) {
        if (isBriefing) briefingsLoading = true
        else decisionsLoading = true
      }
      if (r?.error) {
        if (isBriefing) briefingError ??= r.error
        else decisionError ??= r.error
      }
      return
    }
    if (r.error) complete = false
    const rows = r.data.rows
    byKind[kind] = rows.length
    pendingCount = Math.max(pendingCount ?? 0, r.data.pending_count)
    ;(isBriefing ? briefings : decisions).push(...rows)
  })
  const listed = decisions.length + briefings.length
  return {
    decisions: decisions.sort(byNewest),
    briefings: briefings.sort(byNewest),
    byKind,
    pendingCount,
    listed,
    // Only a whole read can say a kind is missing; a partial one is still loading.
    unaccounted: complete && pendingCount != null ? Math.max(0, pendingCount - listed) : 0,
    decisionsLoading,
    briefingsLoading,
    error: decisionError ?? briefingError,
    complete,
  }
}
