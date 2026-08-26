import { Inbox } from 'lucide-react'
import { DraftCard } from '@/components/cockpit/DraftCard'
import { EmptyState } from '@/components/data-display'
import {
  useApproveDraft,
  useDismissDraft,
  useResearchDrafts,
} from '@/hooks/useResearchDrafts'

export function InboxTab() {
  const { data, isLoading, isError, error, refetch } = useResearchDrafts({
    status: 'pending',
    refetchIntervalMs: 15_000,
  })
  const approve = useApproveDraft()
  const dismiss = useDismissDraft()
  const rows = data?.rows ?? []

  if (isLoading) {
    return (
      <p className="text-dense-meta text-muted-foreground px-0.5 py-2">Loading drafts…</p>
    )
  }

  if (isError) {
    return (
      <div className="space-y-2 px-0.5 py-2">
        <p className="text-dense-meta text-destructive">
          {error instanceof Error ? error.message : 'Failed to load drafts'}
        </p>
        <button
          type="button"
          className="text-dense-meta text-primary underline"
          onClick={() => void refetch()}
        >
          Retry
        </button>
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Inbox />}
        title="Inbox empty"
        description="Morning Prep, EOD Review, and Playbook drafts appear here for approval."
      />
    )
  }

  return (
    <div className="space-y-2.5">
      <p className="text-dense-caption font-semibold uppercase tracking-wide text-muted-foreground">
        Pending ({data?.pending_count ?? rows.length})
      </p>
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
  )
}
