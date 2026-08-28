import { ChevronDown, ChevronRight, Inbox } from 'lucide-react'
import { DraftCard } from '@/components/cockpit/DraftCard'
import {
  useApproveDraft,
  useDismissDraft,
  useResearchDrafts,
} from '@/hooks/useResearchDrafts'
import { useCockpitDrawer } from '@/hooks/useCockpitDrawer'
import { cn } from '@/lib/utils'

/**
 * Pending-draft banner (Wave RS-UX6).
 *
 * Replaces the old `Inbox` tab.  Drafts arrive asynchronously (Morning Prep,
 * EOD Review) and approving one usually means asking the Copilot about it
 * first — a tab forced the chat off screen at exactly the wrong moment.  The
 * banner keeps the conversation visible and expands the queue in place.
 *
 * Renders nothing when the queue is empty, so it costs zero space on a normal
 * day instead of occupying a permanent top-level slot.
 */
export function InboxBanner({ className }: { className?: string }) {
  const { inboxOpen, setInboxOpen } = useCockpitDrawer()
  const { data, isLoading, isError, error, refetch } = useResearchDrafts({
    status: 'pending',
    refetchIntervalMs: 15_000,
  })
  const approve = useApproveDraft()
  const dismiss = useDismissDraft()

  const rows = data?.rows ?? []
  const count = data?.pending_count ?? rows.length

  // Nothing pending and nothing to report — stay out of the way entirely.
  if (!isError && count === 0) return null

  if (isError) {
    return (
      <div
        role="alert"
        className={cn(
          'flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1.5',
          className,
        )}
      >
        <span className="min-w-0 flex-1 truncate text-dense-meta text-destructive">
          {error instanceof Error ? error.message : 'Failed to load drafts'}
        </span>
        <button
          type="button"
          className="shrink-0 text-dense-meta text-primary underline"
          onClick={() => void refetch()}
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-md border border-primary/30 bg-primary/5',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setInboxOpen(!inboxOpen)}
        aria-expanded={inboxOpen}
        className={cn(
          'flex w-full items-center gap-1.5 px-2 py-1.5 text-left',
          'text-dense-label text-foreground hover:bg-primary/10',
          inboxOpen ? 'rounded-t-md' : 'rounded-md',
        )}
      >
        {inboxOpen ? (
          <ChevronDown className="size-3.5 shrink-0 text-primary" aria-hidden />
        ) : (
          <ChevronRight className="size-3.5 shrink-0 text-primary" aria-hidden />
        )}
        <Inbox className="size-3.5 shrink-0 text-primary" aria-hidden />
        <span className="min-w-0 flex-1 truncate font-medium">
          {count} draft{count === 1 ? '' : 's'} pending
        </span>
        <span className="shrink-0 text-dense-caption text-muted-foreground">
          {inboxOpen ? 'Hide' : 'Review'}
        </span>
      </button>

      {inboxOpen ? (
        <div className="max-h-64 space-y-2 overflow-y-auto border-t border-primary/20 px-2 py-2">
          {isLoading ? (
            <p className="text-dense-meta text-muted-foreground">Loading drafts…</p>
          ) : (
            rows.map((draft) => (
              <DraftCard
                key={draft.id}
                draft={draft}
                approving={approve.isPending && approve.variables === draft.id}
                dismissing={dismiss.isPending && dismiss.variables === draft.id}
                onApprove={() => approve.mutate(draft.id)}
                onDismiss={() => dismiss.mutate(draft.id)}
              />
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}
