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
const BRIEFING_KINDS = new Set<string>(['morning_brief', 'eod_verdict'])

const LOOP_KINDS = new Set<string>(['candidate_batch', 'policy_suggestion'])

/**
 * Anything that is not a briefing or a loop item needs a call.
 *
 * Defined by exclusion on purpose. The backend already emits `order_intent`,
 * which DraftKind does not model; an allowlist would have dropped it out of
 * every group filter, and with Decisions as the default view it would have been
 * invisible on load. A draft the UI does not recognise is exactly the one a
 * human should see.
 */
function isDecisionKind(kind: string): boolean {
  return !BRIEFING_KINDS.has(kind) && !LOOP_KINDS.has(kind)
}

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

  // Shown next to the filter so the split is visible without switching views:
  // you can see at a glance whether anything actually needs a call today.
  const counts = useMemo(() => {
    const all = query.data?.rows ?? []
    return {
      decisions: all.filter((d) => isDecisionKind(d.kind)).length,
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
          {counts.decisions} to decide · {counts.briefings} briefing
          {counts.briefings === 1 ? '' : 's'} ·{' '}
          {query.data?.pending_count ?? rows.length} pending
        </span>
      </div>

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
        <div className="space-y-2 max-w-3xl">
          {rows.map((draft) => (
            <DraftCard
              key={draft.id}
              draft={draft}
              approving={approve.isPending && approve.variables === draft.id}
              dismissing={dismiss.isPending && dismiss.variables === draft.id}
              onApprove={() => approve.mutate(draft.id)}
              onDismiss={() => dismiss.mutate(draft.id)}
            />
          ))}
        </div>
      )}
    </PageShell>
  )
}
