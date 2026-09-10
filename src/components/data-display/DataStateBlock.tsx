/**
 * The three things a data surface says when it has no rows to show.
 *
 * Pair with `dataState` from `@/lib/dataState`, which decides which one:
 *
 *   const state = dataState({ isPending: q.isPending, isError: q.isError, isEmpty: rows.length === 0 })
 *   return state !== 'ready'
 *     ? <DataStateBlock state={state} empty={{ title: 'No upcoming events' }} onRetry={q.refetch} />
 *     : <EventTable rows={rows} />
 *
 * It renders nothing for `ready`, so the caller owns its own content and this
 * imposes no layout.
 */
import { AlertTriangle } from 'lucide-react'
import { EmptyState } from './EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import type { DataState } from '@/lib/dataState'

export interface DataStateBlockProps {
  state: DataState
  /** What "there is genuinely nothing" looks like. */
  empty: { title: string; description?: string; icon?: React.ReactNode; action?: React.ReactNode }
  /** Named so the failure line can say which lens went quiet. */
  sourceLabel?: string
  onRetry?: () => void
  /** Skeleton rows while loading; 0 renders nothing. */
  skeletonRows?: number
  className?: string
}

export function DataStateBlock({
  state,
  empty,
  sourceLabel,
  onRetry,
  skeletonRows = 3,
  className,
}: DataStateBlockProps) {
  if (state === 'ready') return null

  if (state === 'loading') {
    if (skeletonRows <= 0) return null
    return (
      <div className={className}>
        <div className="flex flex-col gap-2">
          {Array.from({ length: skeletonRows }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded-md" />
          ))}
        </div>
      </div>
    )
  }

  if (state === 'failed') {
    return (
      <EmptyState
        className={className}
        icon={<AlertTriangle className="text-warning" />}
        title={sourceLabel ? `${sourceLabel} unavailable` : 'Source unavailable'}
        // Never the empty copy. Empty copy asserts a fact about the market or
        // the book; nothing was read, so no such fact is available.
        description="This did not answer — whether there is anything here is unknown."
        action={
          onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="text-dense-caption underline underline-offset-2 hover:text-foreground"
            >
              Try again
            </button>
          ) : undefined
        }
      />
    )
  }

  return (
    <EmptyState
      className={className}
      icon={empty.icon}
      title={empty.title}
      description={empty.description}
      action={empty.action}
    />
  )
}
