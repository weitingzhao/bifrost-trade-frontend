/**
 * The moment after Approve (Design 2026-09-13 ⑥): the card leaves the queue —
 * the server cannot take an approval back, so no Undo — and what remains is a
 * strip above the queue, gone after a few seconds, saying what was written and
 * where to check it: `Approved → hypothesis h-12 set active · view`.
 *
 * One implementation for the three places that approve (Decision Inbox, the
 * Desk's Waiting on you, the cockpit's InboxBanner). The destination comes
 * from `approveEffect` — the server's own branches — and an id is named only
 * when the server's `executed` payload actually carries one; nothing is
 * invented for kinds whose approval only changes the draft's status.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import type { AiDraft } from '@/api/researchDrafts'
import { approveEffect } from '@/lib/harness/draftText'
import { cn } from '@/lib/utils'

/** What `approveResearchDraft` resolves to — the approved draft plus the server's `executed` record. */
export interface ApprovedDraftResult {
  draft: AiDraft
  executed?: Record<string, unknown>
}

/** How long the strip stays. Long enough to read one line, short enough to never need dismissing. */
export const APPROVED_STRIP_MS = 6000

/**
 * The hypothesis the server says it wrote, or null. `executed.hypothesis` is
 * the patched/created row on the eod_verdict and morning_brief branches and
 * absent or null everywhere else — so an id shown here is one that exists.
 */
function approvedHypothesisDetail(executed: Record<string, unknown> | undefined): string | null {
  const hyp = executed?.hypothesis
  if (!hyp || typeof hyp !== 'object') return null
  const row = hyp as Record<string, unknown>
  if (typeof row.id !== 'string' || !row.id) return null
  const status = typeof row.status === 'string' && row.status ? row.status : null
  return `hypothesis ${row.id}${status ? ` set ${status}` : ''}`
}

/** What a candidate batch's approval promoted, counted off the server's own lists. */
function approvedBatchDetail(executed: Record<string, unknown> | undefined): string | null {
  const promoted = Array.isArray(executed?.promoted) ? executed.promoted.length : null
  const hypotheses = Array.isArray(executed?.hypotheses) ? executed.hypotheses.length : null
  if (promoted === null && hypotheses === null) return null
  const parts: string[] = []
  if (promoted !== null) parts.push(`${promoted} promoted`)
  if (hypotheses !== null) parts.push(`${hypotheses} hypothes${hypotheses === 1 ? 'is' : 'es'} opened`)
  return parts.join(' · ')
}

export interface ApprovedStripLine {
  text: string
  /** Where to check the write — `approveEffect`'s destination, absent when nothing was written. */
  viewTo: string | null
}

/** The strip's one line. Exported for the tests that pin the three wordings. */
export function approvedStripLine(
  draft: Pick<AiDraft, 'kind' | 'payload' | 'scope'>,
  executed: Record<string, unknown> | undefined,
): ApprovedStripLine {
  const effect = approveEffect(draft)
  const hypDetail = approvedHypothesisDetail(executed)
  if (!effect) {
    // Advisory kinds: the status changed, nothing else was written — say only that.
    return { text: hypDetail ? `Approved · ${hypDetail}` : 'Approved', viewTo: null }
  }
  const batchDetail = draft.kind === 'candidate_batch' ? approvedBatchDetail(executed) : null
  const head = hypDetail ?? effect.label
  return {
    text: `Approved → ${head}${batchDetail ? ` · ${batchDetail}` : ''}`,
    viewTo: effect.to,
  }
}

/**
 * The strip's visibility: the latest approval result while its few seconds
 * last, null after. Split from the render so a caller that unmounts on an
 * empty queue (InboxBanner) can keep itself alive for the confirmation.
 */
export function useApprovedStripState(
  result: ApprovedDraftResult | undefined,
): ApprovedDraftResult | null {
  const id = result?.draft?.id ?? null
  // A fresh approval shows at once because its id has not expired yet; the
  // effect only ever arms the expiry timer, so no render is triggered inside it.
  const [expiredId, setExpiredId] = useState<string | null>(null)
  useEffect(() => {
    if (!id) return
    const timer = setTimeout(() => setExpiredId(id), APPROVED_STRIP_MS)
    return () => clearTimeout(timer)
  }, [id])
  return result && id && expiredId !== id ? result : null
}

export function ApprovedStrip({
  state,
  className,
}: {
  state: ApprovedDraftResult | null
  className?: string
}) {
  if (!state) return null
  const line = approvedStripLine(state.draft, state.executed)
  return (
    <div
      role="status"
      className={cn(
        'flex flex-wrap items-center gap-1.5 rounded-md border border-success/40 bg-success-soft px-3 py-1.5 text-dense-meta',
        className,
      )}
    >
      <CheckCircle2 className="size-3.5 shrink-0 text-success" aria-hidden />
      <span className="min-w-0">{line.text}</span>
      {line.viewTo ? (
        <Link to={line.viewTo} className="text-primary hover:underline">
          view
        </Link>
      ) : null}
    </div>
  )
}
