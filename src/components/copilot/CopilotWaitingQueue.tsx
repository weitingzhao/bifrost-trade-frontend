import { useMemo, useState } from 'react'
import {
  ApprovedStrip,
  useApprovedStripState,
  type ApprovedDraftResult,
} from '@/components/cockpit/ApprovedStrip'
import { ResearchAuthGap } from '@/components/auth/ResearchAuthGap'
import { firstResearchAuthGapError } from '@/lib/auth/researchAuthGap'
import { digestExhibits, isDailyDigest } from '@/lib/harness/dailyDigest'
import { draftAskedBy, draftLandsIn, draftTitle } from '@/lib/harness/draftText'
import { cardApproveToast, cardDismissToast, type InboxCard } from '@/lib/harness/inboxCards'
import {
  openDigestInCopilot,
  openDraftInCopilot,
  openLoopRunInCopilot,
} from '@/lib/harness/loopCopilotPrefill'
import { useCockpitDrawer } from '@/hooks/useCockpitDrawer'
import { useInboxCards } from '@/hooks/useInboxCards'
import { useActiveObjectives, useAwaitingRuns } from '@/hooks/useLoopHarness'
import {
  waitingBriefingDrafts,
  waitingQueueHeadline,
  waitingQueueItems,
  waitingQueueSummary,
} from '@/lib/copilot/waitingQueue'
import { cn } from '@/lib/utils'
import { CloseButton } from '@/components/data-display'

/**
 * The Desk / Inbox waiting queue, one collapsed row. It reads and counts what
 * the Decision Inbox does (`useInboxCards`): "N waiting on you" is the Inbox's
 * "To decide" less its rule proposals, which are read off Review's habits and
 * have no draft to answer here. Chat writes stay in the thread.
 */
export function CopilotWaitingQueue({ className }: { className?: string }) {
  const { inboxOpen, setInboxOpen } = useCockpitDrawer()
  const { queue, briefingRows, cards, hidden, dismiss, approve } = useInboxCards()
  // What the last held approval wrote, once it went out.
  const [approved, setApproved] = useState<ApprovedDraftResult | undefined>(undefined)
  const approvedStrip = useApprovedStripState(approved)
  const awaitingQ = useAwaitingRuns()
  const objectivesQ = useActiveObjectives()

  const objectiveTitleById = useMemo(() => {
    const map = new Map<string, string>()
    for (const o of objectivesQ.data?.items ?? []) map.set(o.id, o.title)
    return map
  }, [objectivesQ.data?.items])

  const runRows = awaitingQ.data?.items
  const items = useMemo(
    () => waitingQueueItems(cards, briefingRows, runRows ?? [], objectiveTitleById),
    [cards, briefingRows, objectiveTitleById, runRows],
  )
  const briefingDraftCount = waitingBriefingDrafts(briefingRows).length
  const runCount = awaitingQ.data?.count ?? runRows?.length ?? 0
  const draftsFailed = queue.error != null
  const runsFailed = awaitingQ.isError
  // A refused read is not zero calls: the title says «—» until the queue is in.
  const n = draftsFailed || queue.decisionsLoading ? null : cards.length
  const summary = waitingQueueSummary({
    briefingCount: briefingDraftCount,
    runCount,
  })

  // Signed out, every Research read is refused alike: one grey line, not a
  // queue of «—» (Design 2026-09-15 Q2=A).
  const authGap = firstResearchAuthGapError(queue.error, awaitingQ.error)
  if (authGap) {
    return <ResearchAuthGap error={authGap} layout="banner" className={className} />
  }

  if (!draftsFailed && !runsFailed && !n && briefingDraftCount === 0 && runCount === 0) {
    return approvedStrip ? <ApprovedStrip state={approvedStrip} className={className} /> : null
  }

  if (!n && briefingDraftCount === 0 && runCount === 0 && (draftsFailed || runsFailed)) {
    return (
      <ResearchAuthGap
        error={queue.error ?? awaitingQ.error}
        onRetry={() => {
          if (runsFailed) void awaitingQ.refetch()
        }}
        layout="banner"
        className={className}
      />
    )
  }

  // The newest run covers the earlier ones: they leave with it and, once the
  // write lands, stay folded away (Owner 2026-10-04 #11) — as on the Inbox.
  const foldAway = (card: InboxCard) =>
    card.shape === 'objective' && card.folded.length > 0
      ? {
          alsoHide: card.folded.map((d) => d.id),
          onCommitted: () => hidden.setMany(card.folded.map((d) => d.id), true),
        }
      : {}
  // Approve and Dismiss are both held: the row leaves at once, Undo or ⌘Z
  // for five seconds, then the write (batch 4 follow-up).
  const approveCard = (card: InboxCard) =>
    approve(card.head.id, cardApproveToast(card, draftTitle(card.head)), { onLanded: setApproved, ...foldAway(card) })
  const dismissCard = (card: InboxCard) =>
    dismiss(
      card.answers.map((d) => d.id),
      cardDismissToast(card),
      foldAway(card),
    )

  return (
    <div
      className={cn(
        'min-w-0 overflow-hidden rounded-md border border-warning/40 bg-warning/5',
        className
      )}
    >
      <button
        type="button"
        onClick={() => setInboxOpen(!inboxOpen)}
        aria-expanded={inboxOpen}
        className={cn(
          'flex w-full items-center gap-1.5 px-2 py-1.5 text-left',
          'text-dense-label text-foreground hover:bg-warning/10',
          inboxOpen ? 'rounded-t-md' : 'rounded-md'
        )}
      >
        <span className="size-1.5 shrink-0 rounded-full bg-warning" aria-hidden />
        <span className="shrink-0 font-semibold">{waitingQueueHeadline(n)}</span>
        {summary ? (
          <span className="min-w-0 flex-1 truncate text-muted-foreground">{summary}</span>
        ) : (
          <span className="min-w-0 flex-1" />
        )}
        <span className="shrink-0 text-dense-caption text-muted-foreground">
          {inboxOpen ? 'Hide' : 'Review'}
        </span>
      </button>

      {inboxOpen ? (
        <div className="max-h-64 overflow-y-auto border-t border-warning/20">
          <ApprovedStrip state={approvedStrip} />
          {items.map((row) => (
            <div
              key={row.key}
              className="flex min-w-0 items-center gap-1 border-b border-border/40 px-2 py-1 last:border-b-0"
            >
              <span className="w-12 shrink-0 truncate text-dense-caption text-muted-foreground">
                {row.kindLabel}
              </span>
              <span className="min-w-0 flex-1 truncate text-dense-caption" title={row.what}>
                {row.what}
              </span>
              <span className="inline-flex shrink-0">
                <button
                  type="button"
                  className="h-5 px-1 text-dense-caption hover:bg-secondary"
                  title="Prefill the composer — does not send"
                  onClick={() => {
                    if (row.kind === 'briefings' && row.draft) {
                      if (isDailyDigest(row.draft)) {
                        openDigestInCopilot({
                          draftId: row.draft.id,
                          day:
                            typeof row.draft.payload.day === 'string'
                              ? row.draft.payload.day
                              : null,
                          symbols: digestExhibits(row.draft.payload).map((r) => r.symbol),
                        })
                      } else {
                        openDraftInCopilot({
                          id: row.draft.id,
                          kind: row.draft.kind,
                          title: draftTitle(row.draft),
                          askedBy: draftAskedBy(row.draft.generated_by),
                          landsIn: draftLandsIn(row.draft.kind)?.label ?? null,
                        })
                      }
                    } else if (row.kind === 'decision' && row.draft) {
                      openDraftInCopilot({
                        id: row.draft.id,
                        kind: row.draft.kind,
                        title: draftTitle(row.draft),
                        askedBy: draftAskedBy(row.draft.generated_by),
                        landsIn: draftLandsIn(row.draft.kind)?.label ?? null,
                      })
                    } else if (row.kind === 'run' && row.runId) {
                      openLoopRunInCopilot({ runId: row.runId, title: row.what })
                    }
                  }}
                >
                  Ask
                </button>
                {row.showApprove && row.card ? (
                  <button
                    type="button"
                    className="h-5 px-1 text-dense-caption text-primary hover:bg-secondary"
                    title="Approve — Undo for five seconds"
                    onClick={() => approveCard(row.card!)}
                  >
                    ✓
                  </button>
                ) : null}
                {row.showDismiss && row.card ? (
                  <CloseButton
                    onClick={() => dismissCard(row.card!)}
                    label="Dismiss"
                    title="Dismiss — Undo for five seconds"
                  />
                ) : null}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
