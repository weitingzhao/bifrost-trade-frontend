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

type KindFilter = 'all' | 'decisions' | 'loop' | DraftKind

const KIND_OPTIONS: { value: KindFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'decisions', label: 'Decisions' },
  { value: 'loop', label: 'Loop' },
  { value: 'hypothesis_suggestion', label: 'Hypothesis' },
  { value: 'morning_brief', label: 'Morning' },
  { value: 'eod_verdict', label: 'EOD' },
  { value: 'candidate_batch', label: 'Candidates' },
  { value: 'policy_suggestion', label: 'Policy' },
]

const DECISION_KINDS = new Set<DraftKind>([
  'hypothesis_suggestion',
  'morning_brief',
  'eod_verdict',
  'playbook_rule',
  'playbook_note',
])

const LOOP_KINDS = new Set<DraftKind>(['candidate_batch', 'policy_suggestion'])

export default function DecisionInboxPage() {
  const [kindFilter, setKindFilter] = useState<KindFilter>('all')

  const apiKind =
    kindFilter === 'all' || kindFilter === 'decisions' || kindFilter === 'loop'
      ? undefined
      : (kindFilter as DraftKind)

  const query = useResearchDrafts({ status: 'pending', kind: apiKind })
  const approve = useApproveDraft()
  const dismiss = useDismissDraft()

  const rows = useMemo(() => {
    const all = query.data?.rows ?? []
    if (kindFilter === 'decisions') {
      return all.filter((d) => DECISION_KINDS.has(d.kind))
    }
    if (kindFilter === 'loop') {
      return all.filter((d) => LOOP_KINDS.has(d.kind))
    }
    return all
  }, [query.data?.rows, kindFilter])

  return (
    <PageShell padding="default" className="space-y-3">
      <PageHeader
        title="Decision Inbox"
        description="Pending AI drafts awaiting approve or dismiss. Prefer hypothesis / decision kinds."
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
          title="Inbox clear"
          description="No pending drafts. Morning Prep / EOD agents write here when they run."
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
