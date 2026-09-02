/**
 * Decision Inbox — Research Loop v1.
 * `/research/loop/decisions`
 *
 * Surfaces pending AI drafts (Morning / EOD / hypothesis suggestions).
 */
import { useMemo, useState } from 'react'
import { Inbox } from 'lucide-react'
import { PageHeader, PageShell } from '@/components/layout'
import { EmptyState, SegmentControl } from '@/components/data-display'
import { Button } from '@/components/ui/button'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { Skeleton } from '@/components/ui/skeleton'
import { DraftCard } from '@/components/cockpit/DraftCard'
import { NewDraftDialog } from '@/components/research/NewDraftDialog'
import {
  useApproveDraft,
  useDismissDraft,
  useResearchDrafts,
} from '@/hooks/useResearchDrafts'
import type { DraftKind } from '@/api/researchDrafts'
import {
  BRIEFING_KINDS,
  LOOP_KINDS,
  groupIdenticalDrafts,
  isActionableDraft,
  isDecisionKind,
} from '@/lib/harness/harnessDraftHelpers'

type KindFilter = 'all' | 'decisions' | 'briefings' | 'loop' | DraftKind

const KIND_OPTIONS: { value: KindFilter; label: string }[] = [
  { value: 'decisions', label: 'Decisions' },
  { value: 'briefings', label: 'Briefings' },
  { value: 'loop', label: 'Loop' },
  { value: 'all', label: 'All' },
  { value: 'hypothesis_suggestion', label: 'Hypothesis' },
  { value: 'morning_brief', label: 'Morning' },
  { value: 'eod_verdict', label: 'EOD' },
  { value: 'candidate_batch', label: 'Candidates' },
  { value: 'policy_suggestion', label: 'Policy' },
]

/**
 * Recurring agent posts — read them, then move on.
 *
 * These used to sit in the decisions bucket, so even the Decisions filter
 * carried the two agents' daily status posts — "no material change; keep
 * active", "Today's Discoveries: SEPA PAYS 82.75…". Those need reading, not a
 * verdict, and putting an Approve button on them teaches you to clear the queue
 * without looking, which is how a real decision gets waved through.
 */
export default function DecisionInboxPage() {
  // Opens on what needs a call. Briefings stay one click away with their own
  // count, so nothing is hidden — it just stops competing for the same attention.
  const [kindFilter, setKindFilter] = useState<KindFilter>('decisions')

  const apiKind =
    kindFilter === 'all' ||
    kindFilter === 'decisions' ||
    kindFilter === 'briefings' ||
    kindFilter === 'loop'
      ? undefined
      : (kindFilter as DraftKind)

  const query = useResearchDrafts({ status: 'pending', kind: apiKind })
  const approve = useApproveDraft()
  const dismiss = useDismissDraft()

  const rows = useMemo(() => {
    const all = query.data?.rows ?? []
    if (kindFilter === 'decisions') {
      return all.filter((d) => isDecisionKind(d.kind))
    }
    if (kindFilter === 'briefings') {
      return all.filter((d) => BRIEFING_KINDS.has(d.kind))
    }
    if (kindFilter === 'loop') {
      return all.filter((d) => LOOP_KINDS.has(d.kind))
    }
    return all
  }, [query.data?.rows, kindFilter])

  // One card per decision, not per draft. Repeated runs of the same objective
  // post an identical batch each time; they are folded into the newest and
  // listed under it rather than dropped.
  const groups = useMemo(() => groupIdenticalDrafts(rows), [rows])

  // Shown next to the filter so the split is visible without switching views:
  // you can see at a glance whether anything actually needs a call today.
  //
  // `decisions` counts calls, not drafts. Counting drafts is what let the header
  // read "25 to decide" when thirteen were the same eight symbols and eight more
  // were policy suggestions that would write nothing.
  const counts = useMemo(() => {
    const all = query.data?.rows ?? []
    const decisionGroups = groupIdenticalDrafts(all.filter((d) => isDecisionKind(d.kind)))
    return {
      decisions: decisionGroups.filter((g) => isActionableDraft(g.draft)).length,
      inert: decisionGroups.filter((g) => !isActionableDraft(g.draft)).length,
      collapsed: decisionGroups.reduce((n, g) => n + g.superseded.length, 0),
      briefings: all.filter((d) => BRIEFING_KINDS.has(d.kind)).length,
    }
  }, [query.data?.rows])

  return (
    <PageShell padding="default" className="space-y-3">
      <PageHeader
        title="Decision Inbox"
        description="Drafts that need a call. Recurring agent posts live under Briefings."
        actions={<NewDraftDialog />}
      />

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-dense-meta font-medium text-muted-foreground shrink-0">Kind:</span>
        <SegmentControl
          value={kindFilter}
          onChange={(v) => setKindFilter(v as KindFilter)}
          options={KIND_OPTIONS}
        />
        <span className="text-dense-meta text-muted-foreground ml-auto">
          {counts.decisions} to decide
          {counts.inert > 0 ? ` · ${counts.inert} nothing to merge` : ''} ·{' '}
          {counts.briefings} briefing{counts.briefings === 1 ? '' : 's'} ·{' '}
          {query.data?.pending_count ?? rows.length} pending
          {counts.collapsed > 0 ? ` · ${counts.collapsed} repeats folded in` : ''}
        </span>
      </div>

      {approve.isError ? <QueryErrorAlert error={approve.error} /> : null}
      {dismiss.isError ? <QueryErrorAlert error={dismiss.error} /> : null}

      {query.isError ? (
        <QueryErrorAlert error={query.error} />
      ) : query.isLoading ? (
        <Skeleton className="h-48 w-full rounded-md" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Inbox />}
          title={kindFilter === 'decisions' ? 'Nothing to decide' : 'Inbox clear'}
          description={
            kindFilter === 'decisions' && counts.briefings > 0
              ? `No draft needs a call. ${counts.briefings} agent briefing${counts.briefings === 1 ? '' : 's'} waiting under Briefings.`
              : 'No pending drafts. Morning Prep / EOD agents write here when they run.'
          }
        />
      ) : (
        // Cards were capped at 48rem, using 57% of the canvas while candidate
        // rows wrapped inside them. Width belongs to the content that needs it:
        // the batch rows take it, prose and the policy diff cap themselves.
        //
        // Gap is 4, not 2: at 2 the space between two decisions matched the
        // space between a card's own lines, so eleven cards read as one wall.
        <div className="max-w-7xl space-y-4">
          {groups.map(({ draft, superseded }) => {
            // A card that would write nothing on Approve keeps its content and
            // its colour, at lower weight — the calls that matter sit forward,
            // and nothing is hidden or reordered to get there.
            const actionable = isActionableDraft(draft)
            return (
              <div key={draft.id} className="space-y-1">
                <DraftCard
                  draft={draft}
                  muted={!actionable}
                  approving={approve.isPending && approve.variables === draft.id}
                  dismissing={dismiss.isPending && dismiss.variables === draft.id}
                  onApprove={() => approve.mutate(draft.id)}
                  onDismiss={() => dismiss.mutate(draft.id)}
                />
                {superseded.length > 0 ? (
                  // Indented under its own card: unattached, this line sat
                  // between two cards belonging visibly to neither.
                  <div className="ml-3.5 flex flex-wrap items-center gap-2 border-l-2 border-border/50 pl-2 text-dense-meta text-muted-foreground">
                    <span>
                      {superseded.length} earlier run{superseded.length === 1 ? '' : 's'} proposed
                      exactly this. Folded in, not decided for you.
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2"
                      disabled={dismiss.isPending}
                      onClick={() => {
                        for (const stale of superseded) dismiss.mutate(stale.id)
                      }}
                    >
                      Dismiss {superseded.length}
                    </Button>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </PageShell>
  )
}
