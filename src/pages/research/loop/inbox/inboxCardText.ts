/**
 * What an Inbox card says about itself in its folded row and its fold —
 * the words, kept apart from the page so they can be tested.
 */
import type { AiDraft } from '@/api/researchDrafts'
import { approveEffect } from '@/lib/harness/draftText'
import type { DraftHeadline } from '@/lib/harness/draftHeadline'
import { candidateBatchItems, isActionableDraft, policySuggestionMergeCount } from '@/lib/harness/harnessDraftHelpers'
import type { InboxCard } from '@/lib/harness/inboxCards'
import { orderIntentView } from '@/lib/harness/orderIntent'
import { isObjectivePatch } from '@/lib/harness/writesTo'

/**
 * Where Approve would write, for the folded row (Rev .144): grey mono, no
 * button. The words follow the server (`approveEffect`), not the prototype's
 * fixture: a batch's Approve also opens a hypothesis per name, which the
 * design's `Approve → Pool (3)` leaves out.
 */
export function quickApproveHint(card: InboxCard): string {
  const d = card.head
  if (d.kind === 'candidate_batch') {
    const n = candidateBatchItems(d.payload).length
    return `Approve → Pool (${n}) · ${n} hypothes${n === 1 ? 'is' : 'es'}`
  }
  if (isObjectivePatch(d.kind, d.scope)) {
    const m = policySuggestionMergeCount(d.payload)
    return m > 0 ? `Approve → merge policy (${m} field${m === 1 ? '' : 's'})` : 'Approve writes nothing'
  }
  const effect = approveEffect(d)
  return effect ? `Approve → ${effect.label}` : 'Approve writes nothing'
}

/** One earlier draft, as the fold lists it. */
export function describeDraft(d: AiDraft): string {
  if (d.kind === 'candidate_batch') {
    const syms = candidateBatchItems(d.payload).map((i) => i.symbol)
    return syms.length > 4 ? `${syms.slice(0, 4).join(' · ')} +${syms.length - 4}` : syms.join(' · ') || 'no names'
  }
  if (d.kind === 'policy_suggestion') {
    const keys = d.payload.suggestion && typeof d.payload.suggestion === 'object' ? Object.keys(d.payload.suggestion) : []
    return keys.length ? keys.join(', ') : 'no fields'
  }
  if (d.kind === 'decision_draft') {
    const v = typeof d.payload.verdict === 'string' ? d.payload.verdict : null
    return v ? `verdict ${v}` : 'verdict'
  }
  if (d.kind === 'order_intent') {
    const t = orderIntentView(d.payload).template
    return t ? `vehicle ${t}` : 'vehicle'
  }
  return d.kind.replace(/_/g, ' ')
}

/** The meta line after the title (Rev .143 #4 / #5). */
export function cardMeta(card: InboxCard, head: DraftHeadline): string {
  const parts: string[] = []
  if (head.setup) parts.push(head.setup)
  if (head.objective) parts.push(head.objective)
  if (card.shape === 'call') {
    parts.push(card.verdict && card.vehicle ? 'verdict + vehicle' : card.verdict ? 'verdict only' : 'vehicle only')
  }
  const earlier = card.folded.length
  if (earlier > 0) {
    parts.push(card.shape === 'call' ? `+${earlier} earlier` : `+${earlier} earlier run${earlier === 1 ? '' : 's'}`)
  }
  return parts.join(' · ')
}

/**
 * Whether answering this card writes anything. A call writes nothing (D10), a
 * patch whose fields are all unchanged merges nothing; both stay on the page
 * at lower weight rather than moving.
 */
export function cardWrites(card: InboxCard): boolean {
  return card.shape !== 'call' && isActionableDraft(card.head)
}

/** The toast for a recorded call. */
export function recordToast(card: InboxCard, head: DraftHeadline): string {
  const what = head.sym ?? head.title
  const n = card.answers.length
  return `Answer recorded on ${what}${n > 1 ? ` (${n} drafts)` : ''} — nothing written, never an order (D10)`
}
