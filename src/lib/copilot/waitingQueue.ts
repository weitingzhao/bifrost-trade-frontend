/**
 * Panel waiting queue — the same calls as Desk / Decision Inbox.
 *
 * Chat writes stay in the message stream (Owner C2-a5 option a).
 */
import type { AiDraft } from '@/api/researchDrafts'
import { digestFirst, isDailyDigest } from '@/lib/harness/dailyDigest'
import { draftKindLabel, draftTitle } from '@/lib/harness/draftText'
import {
  BRIEFING_KINDS,
  groupIdenticalDrafts,
  isActionableDraft,
  isDecisionKind,
  type DraftGroup,
} from '@/lib/harness/harnessDraftHelpers'

export type WaitingQueueKind = 'briefings' | 'decision' | 'run'

export type WaitingQueueItem = {
  key: string
  kind: WaitingQueueKind
  kindLabel: string
  what: string
  showApprove: boolean
  showDismiss: boolean
  draft?: AiDraft
  runId?: string
}

export function waitingDecisionGroups(rows: readonly AiDraft[]): DraftGroup[] {
  return groupIdenticalDrafts(rows.filter((d) => isDecisionKind(d.kind)))
}

export function waitingBriefingDrafts(rows: readonly AiDraft[]): AiDraft[] {
  return digestFirst(rows.filter((d) => BRIEFING_KINDS.has(d.kind)))
}

/**
 * Same three rules as `pending_decision_calls` (Inbox badge): briefings are
 * not calls, identical batches fold, a policy suggestion that would write
 * nothing is not a call.
 */
export function waitingQueueCountsAsCall(draft: AiDraft): boolean {
  if (!isDecisionKind(draft.kind)) return false
  if (draft.kind === 'policy_suggestion' && !isActionableDraft(draft)) return false
  return true
}

export function waitingQueueCallCount(rows: readonly AiDraft[]): number {
  return waitingDecisionGroups(rows).filter((g) => waitingQueueCountsAsCall(g.draft)).length
}

export function waitingQueueHeadline(n: number): string {
  return `${n} waiting on you`
}

export function waitingQueueSummary(opts: { briefingCount: number; runCount: number }): string {
  const bits: string[] = []
  if (opts.briefingCount > 0) bits.push('Briefings')
  if (opts.runCount > 0) {
    bits.push(`${opts.runCount} run${opts.runCount === 1 ? '' : 's'}`)
  }
  return bits.join(' · ')
}

export function waitingQueueShowsApprove(draft: AiDraft): boolean {
  return isActionableDraft(draft)
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

export function waitingQueueItems(
  rows: readonly AiDraft[],
  runs: readonly { id: string; objective_id: string }[],
  objectiveTitleById: ReadonlyMap<string, string>
): WaitingQueueItem[] {
  const out: WaitingQueueItem[] = []
  const briefings = waitingBriefingDrafts(rows)
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
  for (const group of waitingDecisionGroups(rows)) {
    const draft = group.draft
    out.push({
      key: `draft:${draft.id}`,
      kind: 'decision',
      kindLabel: draftKindLabel(draft.kind),
      what: draftTitle(draft),
      showApprove: waitingQueueShowsApprove(draft),
      showDismiss: true,
      draft,
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
