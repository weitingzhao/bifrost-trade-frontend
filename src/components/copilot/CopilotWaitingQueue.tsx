import { useMemo } from 'react'
import { ApprovedStrip, useApprovedStripState } from '@/components/cockpit/ApprovedStrip'
import { digestExhibits, digestFirst, isDailyDigest } from '@/lib/harness/dailyDigest'
import { draftAskedBy, draftKindLabel, draftLandsIn, draftTitle } from '@/lib/harness/draftText'
import {
  openDigestInCopilot,
  openDraftInCopilot,
  openLoopRunInCopilot,
} from '@/lib/harness/loopCopilotPrefill'
import { useCockpitDrawer } from '@/hooks/useCockpitDrawer'
import {
  useApproveDraft,
  useDismissDraft,
  useResearchDrafts,
} from '@/hooks/useResearchDrafts'
import { useActiveObjectives, useAwaitingRuns } from '@/hooks/useLoopHarness'
import {
  waitingQueueHeadline,
  waitingQueueShowsApprove,
  waitingQueueShowsDismiss,
  waitingQueueSummary,
  waitingQueueTotal,
} from '@/lib/copilot/waitingQueue'
import { cn } from '@/lib/utils'

type QueueKind = 'digest' | 'draft' | 'run'

type QueueRow = {
  key: string
  kind: QueueKind
  kindLabel: string
  what: string
  ask: () => void
  approve?: () => void
  dismiss?: () => void
}

/**
 * Inbox drafts and awaiting loop runs as one collapsed row. Chat writes stay
 * in the thread (C2-a5 option a). InboxBanner / LoopBanner files remain (R4).
 */
export function CopilotWaitingQueue({ className }: { className?: string }) {
  const { inboxOpen, setInboxOpen } = useCockpitDrawer()
  const draftsQ = useResearchDrafts({
    status: 'pending',
    refetchIntervalMs: 15_000,
  })
  const approve = useApproveDraft()
  const dismiss = useDismissDraft()
  const approvedStrip = useApprovedStripState(approve.data)
  const awaitingQ = useAwaitingRuns()
  const objectivesQ = useActiveObjectives()

  const objectiveTitleById = useMemo(() => {
    const map = new Map<string, string>()
    for (const o of objectivesQ.data?.items ?? []) map.set(o.id, o.title)
    return map
  }, [objectivesQ.data?.items])

  const draftRows = digestFirst(draftsQ.data?.rows ?? [])
  const draftPending = draftsQ.data?.pending_count ?? draftRows.length
  const runRows = awaitingQ.data?.items ?? []
  const runCount = awaitingQ.data?.count ?? runRows.length
  const digest = draftRows.find(isDailyDigest)
  const n = waitingQueueTotal(draftPending, runCount)
  const summary = waitingQueueSummary({
    digest: Boolean(digest),
    draftPending,
    runCount,
  })

  const rows: QueueRow[] = useMemo(() => {
    const out: QueueRow[] = []
    for (const draft of draftRows) {
      const kind: QueueKind = isDailyDigest(draft) ? 'digest' : 'draft'
      out.push({
        key: `draft:${draft.id}`,
        kind,
        kindLabel: draftKindLabel(draft.kind),
        what: draftTitle(draft),
        ask: () => {
          if (isDailyDigest(draft)) {
            openDigestInCopilot({
              draftId: draft.id,
              day: typeof draft.payload.day === 'string' ? draft.payload.day : null,
              symbols: digestExhibits(draft.payload).map((r) => r.symbol),
            })
          } else {
            openDraftInCopilot({
              id: draft.id,
              kind: draft.kind,
              title: draftTitle(draft),
              askedBy: draftAskedBy(draft.generated_by),
              landsIn: draftLandsIn(draft.kind)?.label ?? null,
            })
          }
        },
        approve: waitingQueueShowsApprove(kind)
          ? () => approve.mutate(draft.id)
          : undefined,
        dismiss: waitingQueueShowsDismiss(kind)
          ? () => dismiss.mutate(draft.id)
          : undefined,
      })
    }
    for (const run of runRows) {
      const title = objectiveTitleById.get(run.objective_id) ?? run.objective_id
      out.push({
        key: `run:${run.id}`,
        kind: 'run',
        kindLabel: 'Run',
        what: title,
        ask: () => openLoopRunInCopilot({ runId: run.id, title }),
      })
    }
    return out
  }, [approve, dismiss, draftRows, objectiveTitleById, runRows])

  const draftsFailed = draftsQ.isError
  const runsFailed = awaitingQ.isError

  if (!draftsFailed && !runsFailed && n === 0) {
    return approvedStrip ? (
      <ApprovedStrip state={approvedStrip} className={className} />
    ) : null
  }

  if (n === 0 && (draftsFailed || runsFailed)) {
    return (
      <div
        role="alert"
        className={cn(
          'flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1.5',
          className,
        )}
      >
        <span className="min-w-0 flex-1 truncate text-dense-meta text-destructive">
          {draftsFailed && runsFailed
            ? 'Failed to load waiting queue'
            : draftsFailed
              ? draftsQ.error instanceof Error
                ? draftsQ.error.message
                : 'Failed to load drafts'
              : awaitingQ.error instanceof Error
                ? awaitingQ.error.message
                : 'Failed to load loop runs'}
        </span>
        <button
          type="button"
          className="shrink-0 text-dense-meta text-primary underline"
          onClick={() => {
            if (draftsFailed) void draftsQ.refetch()
            if (runsFailed) void awaitingQ.refetch()
          }}
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className={cn('min-w-0 overflow-hidden rounded-md border border-warning/40 bg-warning/5', className)}>
      <button
        type="button"
        onClick={() => setInboxOpen(!inboxOpen)}
        aria-expanded={inboxOpen}
        className={cn(
          'flex w-full items-center gap-1.5 px-2 py-1.5 text-left',
          'text-dense-label text-foreground hover:bg-warning/10',
          inboxOpen ? 'rounded-t-md' : 'rounded-md',
        )}
      >
        <span
          className="size-1.5 shrink-0 rounded-full bg-warning"
          aria-hidden
        />
        <span className="shrink-0 font-semibold">{waitingQueueHeadline(n)}</span>
        {summary ? (
          <span className="min-w-0 flex-1 truncate text-muted-foreground">
            {summary}
          </span>
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
          {rows.map((row) => (
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
                  onClick={row.ask}
                >
                  Ask
                </button>
                {row.approve ? (
                  <button
                    type="button"
                    className="h-5 px-1 text-dense-caption text-primary hover:bg-secondary"
                    disabled={approve.isPending}
                    onClick={row.approve}
                  >
                    ✓
                  </button>
                ) : null}
                {row.dismiss ? (
                  <button
                    type="button"
                    className="h-5 px-1 text-dense-caption hover:bg-secondary"
                    disabled={dismiss.isPending}
                    onClick={row.dismiss}
                  >
                    ✕
                  </button>
                ) : null}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
