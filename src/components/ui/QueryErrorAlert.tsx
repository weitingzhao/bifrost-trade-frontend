import { AlertCircle, RefreshCw } from 'lucide-react'
import { getErrorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'

interface QueryErrorAlertProps {
  error: unknown
  onRetry?: () => void
  className?: string
  /** Compact inline variant (no border, smaller text) */
  inline?: boolean
}

export function QueryErrorAlert({ error, onRetry, className, inline }: QueryErrorAlertProps) {
  const message = getErrorMessage(error)

  if (inline) {
    return (
      <span className={cn('inline-flex items-center gap-1 text-xs text-destructive', className)}>
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        {message}
        {onRetry && (
          <button onClick={onRetry} className="underline underline-offset-2 hover:no-underline ml-1">
            Retry
          </button>
        )}
      </span>
    )
  }

  return (
    <div className={cn(
      'flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm',
      className,
    )}>
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-destructive">Failed to load data</p>
        <p className="text-muted-foreground text-xs mt-0.5 break-words">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="shrink-0 flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
        >
          <RefreshCw className="h-3 w-3" />
          Retry
        </button>
      )}
    </div>
  )
}
