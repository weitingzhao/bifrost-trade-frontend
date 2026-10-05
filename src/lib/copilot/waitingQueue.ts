/**
 * Panel waiting queue — the Decision Inbox's queue, folded into one row.
 *
 * It reads what the Inbox reads (`useInboxQueue`, every kind in full) and
 * counts what the Inbox counts: one per card (`buildInboxCards`), with the
 * same held writes and the same earlier runs hidden in this browser left out.
 * It used to read the newest 200 pending drafts of every kind at once — on
 * DEV mostly EOD briefings — and borrow the server's call count for its
 * title, so the title and the list counted different sets and neither was the
 * Inbox's "To decide".
 *
 * Chat writes stay in the message stream (Owner C2-a5 option a).
 */
import type { AiDraft } from '@/api/researchDrafts'
import { digestFirst, isDailyDigest } from '@/lib/harness/dailyDigest'
import { draftTitle } from '@/lib/harness/draftText'
import { cardWrites, type InboxCard } from '@/lib/harness/inboxCards'
import { BRIEFING_KINDS } from '@/lib/harness/harnessDraftHelpers'

export type WaitingQueueKind = 'briefings' | 'decision' | 'run'

export type WaitingQueueItem = {
  key: string
  kind: WaitingQueueKind
  kindLabel: string
  what: string
  showApprove: boolean
  showDismiss: boolean
  /** The draft the row is drawn from: a briefing, or a card's head. */
  draft?: AiDraft
  /** Decision rows: the Inbox card the row stands for. */
  card?: InboxCard
  runId?: string
}

export function waitingBriefingDrafts(rows: readonly AiDraft[]): AiDraft[] {
  return digestFirst(rows.filter((d) => BRIEFING_KINDS.has(d.kind)))
}

/**
 * The title. `null` while the queue cannot be read — a refused read is not
 * zero calls.
 */
export function waitingQueueHeadline(n: number | null): string {
  return `${n ?? '—'} waiting on you`
}

export function waitingQueueSummary(opts: { briefingCount: number; runCount: number }): string {
  const bits: string[] = []
  if (opts.briefingCount > 0) bits.push('Briefings')
  if (opts.runCount > 0) {
    bits.push(`${opts.runCount} run${opts.runCount === 1 ? '' : 's'}`)
  }
  return bits.join(' · ')
}

export function waitingBriefingWhat(drafts: readonly AiDraft[]): string {
  if (drafts.length === 0) return ''
  if (drafts.length === 1) return draftTitle(drafts[0])
  const digest = drafts.find(isDailyDigest)
  const rest = drafts.length - (digest ? 1 : 0)
  if (digest) {
    return rest > 0 ? `Daily digest · ${rest} more` : draftTitle(digest)
  }
  return `${drafts.length} briefings`
}

/**
 * Briefings as one row, then one row per Inbox card, then the runs waiting
 * for a rating. Approve shows only where the Inbox's Approve writes something
 * (`cardWrites`): a call is answered on the Inbox, where its verdict and
 * vehicle are read side by side.
 */
export function waitingQueueItems(
  cards: readonly InboxCard[],
  briefingRows: readonly AiDraft[],
  runs: readonly { id: string; objective_id: string }[],
  objectiveTitleById: ReadonlyMap<string, string>
): WaitingQueueItem[] {
  const out: WaitingQueueItem[] = []
  const briefings = waitingBriefingDrafts(briefingRows)
  if (briefings.length > 0) {
    out.push({
      key: `briefings:${briefings[0].id}`,
      kind: 'briefings',
      kindLabel: 'Briefings',
      what: waitingBriefingWhat(briefings),
      showApprove: false,
      showDismiss: false,
      draft: briefings.find(isDailyDigest) ?? briefings[0],
    })
  }
  for (const card of cards) {
    out.push({
      key: card.key,
      kind: 'decision',
      // The Inbox's words: this is the same queue (Rev .143).
      kindLabel: card.tag,
      what: draftTitle(card.head),
      showApprove: cardWrites(card),
      showDismiss: true,
      draft: card.head,
      card,
    })
  }
  for (const run of runs) {
    out.push({
      key: `run:${run.id}`,
      kind: 'run',
      kindLabel: 'Run',
      what: objectiveTitleById.get(run.objective_id) ?? run.objective_id,
      showApprove: false,
      showDismiss: false,
      runId: run.id,
    })
  }
  return out
}
