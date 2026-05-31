import { cn } from '@/lib/utils'
import type { CheckStatus } from '@/types/stockDataReadiness'
import { fmt } from '@/utils/stockDataReadiness/format'
import { CheckStatusDot } from './CheckStatusDot'

export function StepCheckStrip({
  hasChecked = true,
  loading,
  status,
  primary,
  primaryLabel,
  secondary,
  gap,
  gapUnit,
  target,
  note,
}: {
  hasChecked?: boolean
  loading: boolean
  status: CheckStatus
  primary?: string | null
  primaryLabel?: string
  secondary?: string | null
  gap?: number | null
  gapUnit?: string
  target?: string
  note?: string | null
}) {
  if (!hasChecked) {
    return (
      <div className="rounded-md border border-dashed border-border/60 px-3 py-2 text-xs text-muted-foreground">
        Use Check in the run book header to verify
      </div>
    )
  }
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground px-1 py-1">
        <CheckStatusDot status="loading" />
        Checking…
      </div>
    )
  }
  return (
    <div
      className={cn(
        'rounded-md border px-3 py-2 text-xs space-y-1',
        status === 'ok' && 'border-lamp-green/30 bg-success-soft/30',
        status === 'warn' && 'border-lamp-yellow/30 bg-warning-soft/20',
        status === 'error' && 'border-lamp-red/30 bg-danger-soft/20',
        status === 'void' && 'border-border bg-muted/30',
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <CheckStatusDot status={status} />
        <span className="font-medium text-foreground">
          {primary ?? '—'}
          {primaryLabel && <span className="font-normal text-muted-foreground">{primaryLabel}</span>}
        </span>
        {secondary && <span className="text-muted-foreground">{secondary}</span>}
        {gap != null && gap > 0 && status === 'void' && (
          <span className="text-muted-foreground">Source N/A · {fmt(gap)} {gapUnit}</span>
        )}
        {gap != null && gap > 0 && status !== 'void' && (
          <span className={cn(status === 'error' ? 'text-destructive' : 'text-warning')}>
            Gap: {fmt(gap)} {gapUnit}
          </span>
        )}
        {gap === 0 && <span className="text-emerald-500 dark:text-emerald-400">No gap</span>}
      </div>
      {(target || note) && (
        <div className="text-muted-foreground space-x-2">
          {target && <span>Target: {target}</span>}
          {note && <span>{note}</span>}
        </div>
      )}
    </div>
  )
}
