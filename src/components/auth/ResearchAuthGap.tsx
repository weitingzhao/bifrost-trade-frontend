import { useState } from 'react'
import { ResearchUserSwitcher } from '@/components/auth/ResearchUserSwitcher'
import { EmptyState } from '@/components/data-display'
import { Button } from '@/components/ui/button'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { classifyResearchAuthError } from '@/lib/auth/researchAuthGap'
import { useResearchAuth } from '@/lib/auth/researchUser'
import { cn } from '@/lib/utils'

export const RESEARCH_AUTH_NOT_SET_LINE = 'Research user not set — Set user'
export const RESEARCH_AUTH_EXPIRED_LINE = 'Research user token was rejected — Set user again'

/**
 * Design 2026-09-15 Q2=A: no token + 401 is grey empty, not failed.
 * A token the server still refuses is expired — red, Retry, different copy.
 */
export function ResearchAuthGap({
  error,
  onRetry,
  layout = 'page',
  className,
}: {
  error: unknown
  onRetry?: () => void
  layout?: 'page' | 'banner'
  className?: string
}) {
  const { token } = useResearchAuth()
  const [open, setOpen] = useState(false)
  const gap = classifyResearchAuthError(error, token)
  const dialog = (
    <ResearchUserSwitcher showTrigger={false} open={open} onOpenChange={setOpen} />
  )

  if (!gap) {
    return <QueryErrorAlert error={error} onRetry={onRetry} className={className} />
  }

  if (gap === 'not_set') {
    if (layout === 'banner') {
      return (
        <div
          className={cn(
            'flex items-center gap-2 rounded-md border border-border bg-secondary/40 px-2 py-1.5',
            className,
          )}
        >
          <span className="min-w-0 flex-1 truncate text-dense-meta text-muted-foreground">
            {RESEARCH_AUTH_NOT_SET_LINE}
          </span>
          <button
            type="button"
            className="shrink-0 text-dense-meta text-primary underline"
            onClick={() => setOpen(true)}
          >
            Set user
          </button>
          {dialog}
        </div>
      )
    }
    return (
      <div className={className}>
        <EmptyState
          title={RESEARCH_AUTH_NOT_SET_LINE}
          description="Sessions, personas and standing are scoped to a Research user."
          action={
            <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
              Set user
            </Button>
          }
        />
        {dialog}
      </div>
    )
  }

  if (layout === 'banner') {
    return (
      <div
        role="alert"
        className={cn(
          'flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1.5',
          className,
        )}
      >
        <span className="min-w-0 flex-1 truncate text-dense-meta text-destructive">
          {RESEARCH_AUTH_EXPIRED_LINE}
        </span>
        {onRetry ? (
          <button
            type="button"
            className="shrink-0 text-dense-meta text-primary underline"
            onClick={() => onRetry()}
          >
            Retry
          </button>
        ) : null}
        <button
          type="button"
          className="shrink-0 text-dense-meta text-primary underline"
          onClick={() => setOpen(true)}
        >
          Set user
        </button>
        {dialog}
      </div>
    )
  }

  return (
    <div className={className}>
      <QueryErrorAlert error={new Error(RESEARCH_AUTH_EXPIRED_LINE)} onRetry={onRetry} />
      <div className="mt-2">
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
          Set user
        </Button>
      </div>
      {dialog}
    </div>
  )
}
