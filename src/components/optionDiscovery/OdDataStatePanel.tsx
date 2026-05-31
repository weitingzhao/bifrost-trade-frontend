import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { DiscoveryHint } from './DiscoveryHint'

export type OdDataStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error'

export function OdDataStatePanel({
  status,
  title,
  hint,
  action,
}: {
  status: OdDataStatus
  title?: string
  hint: string
  action?: ReactNode
}) {
  if (status === 'ready') return null
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-secondary/50 p-3 space-y-1',
        status === 'error' && 'border-destructive/40',
      )}
      role={status === 'error' ? 'alert' : 'status'}
      aria-live="polite"
    >
      {title ? <span className="text-sm font-medium">{title}</span> : null}
      <DiscoveryHint className="mt-0">{hint}</DiscoveryHint>
      {action}
    </div>
  )
}
