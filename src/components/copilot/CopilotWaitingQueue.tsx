import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import { ApprovedStrip, useApprovedStripState } from '@/components/cockpit/ApprovedStrip'
import { ResearchAuthGap } from '@/components/auth/ResearchAuthGap'
import { firstResearchAuthGapError } from '@/lib/auth/researchAuthGap'
import { digestExhibits, isDailyDigest } from '@/lib/harness/dailyDigest'
import { draftAskedBy, draftLandsIn, draftTitle } from '@/lib/harness/draftText'
import {
  openDigestInCopilot,
  openDraftInCopilot,
  openLoopRunInCopilot,
} from '@/lib/harness/loopCopilotPrefill'
import { useCockpitDrawer } from '@/hooks/useCockpitDrawer'
import {
  DRAFTS_PAGE_MAX,
  useApproveDraft,
  useDismissDraft,
  useResearchDrafts,
} from '@/hooks/useResearchDrafts'
import { useActiveObjectives, useAutopilotStanding, useAwaitingRuns } from '@/hooks/useLoopHarness'
import {
  waitingBriefingDrafts,
  waitingQueueCallCount,
  waitingQueueHeadline,
  waitingQueueItems,
  waitingQueueSummary,
  waitingQueueTruncationLine,
} from '@/lib/copilot/waitingQueue'
import { cn } from '@/lib/utils'

/**
 * The Desk / Inbox waiting queue, one collapsed row. Same fetch and the same
 * call-count as the Decision Inbox badge. Chat writes stay in the thread.
 * InboxBanner / LoopBanner files remain (R4).
 */
export function CopilotWaitingQueue({ className }: { className?: string }) {
  const { inboxOpen, setInboxOpen } = useCockpitDrawer()
  const draftsQ = useResearchDrafts({
    status: 'pending',
    limit: DRAFTS_PAGE_MAX,
    refetchIntervalMs: 15_000,
  })
  const approve = useApproveDraft()
  const dismiss = useDismissDraft()
  const approvedStrip = useApprovedStripState(approve.data)
  const awaitingQ = useAwaitingRuns()
  const objectivesQ = useActiveObjectives()
  const standingQ = useAutopilotStanding()

  const objectiveTitleById = useMemo(() => {
    const map = new Map<string, string>()
    for (const o of objectivesQ.data?.items ?? []) map.set(o.id, o.title)
    return map
  }, [objectivesQ.data?.items])

  const draftRows = draftsQ.data?.rows
  const runRows = awaitingQ.data?.items
  const listedCallCount = waitingQueueCallCount(draftRows ?? [])
  const callCount =
    standingQ.data?.pending_decisions?.calls ?? listedCallCount
  const truncationLine = waitingQueueTruncationLine(listedCallCount, callCount)
  const items = useMemo(
    () => waitingQueueItems(draftRows ?? [], runRows ?? [], objectiveTitleById),
    [draftRows, objectiveTitleById, runRows],
  )
  const briefingDraftCount = waitingBriefingDrafts(draftRows ?? []).length
  const runCount = awaitingQ.data?.count ?? runRows?.length ?? 0
  const n = callCount
  const summary = waitingQueueSummary({
    briefingCount: briefingDraftCount,
    runCount,
  })

  const draftsFailed = draftsQ.isError
  const runsFailed = awaitingQ.isError

  if (!draftsFailed && !runsFailed && n === 0 && briefingDraftCount === 0 && runCount === 0) {
    return approvedStrip ? <ApprovedStrip state={approvedStrip} className={className} /> : null
  }

  if (n === 0 && briefingDraftCount === 0 && runCount === 0 && (draftsFailed || runsFailed)) {
    return (
      <ResearchAuthGap
        error={firstResearchAuthGapError(draftsQ.error, awaitingQ.error) ?? draftsQ.error ?? awaitingQ.error}
        onRetry={() => {
          if (draftsFailed) void draftsQ.refetch()
          if (runsFailed) void awaitingQ.refetch()
        }}
        layout="banner"
        className={className}
      />
    )
  }

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
                {row.showApprove && row.draft ? (
                  <button
                    type="button"
                    className="h-5 px-1 text-dense-caption text-primary hover:bg-secondary"
                    disabled={approve.isPending}
                    onClick={() => approve.mutate(row.draft!.id)}
                  >
                    ✓
                  </button>
                ) : null}
                {row.showDismiss && row.draft ? (
                  <button
                    type="button"
                    className="h-5 px-1 text-dense-caption hover:bg-secondary"
                    disabled={dismiss.isPending}
                    onClick={() => dismiss.mutate(row.draft!.id)}
                  >
                    ✕
                  </button>
                ) : null}
              </span>
            </div>
          ))}
          {truncationLine ? (
            <Link
              to="/research/loop/decisions"
              className="flex min-w-0 items-center border-t border-warning/20 px-2 py-1.5 text-dense-caption text-muted-foreground hover:bg-warning/10 hover:text-foreground"
            >
              {truncationLine}
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
