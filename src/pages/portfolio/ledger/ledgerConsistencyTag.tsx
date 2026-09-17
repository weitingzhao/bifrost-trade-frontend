import { cn } from '@/lib/utils'
import type { InstanceConsistencyState } from '@/utils/ledger/ledgerOptHelpers'

const MARK: Record<InstanceConsistencyState, string> = {
  same: '=',
  multiple: '⧉',
  mixed: '!',
  none: '○',
}

const TONE: Record<InstanceConsistencyState, string> = {
  same: 'text-[var(--color-success)] border-[var(--color-success)]/40',
  multiple: 'text-sky-400 border-sky-400/40',
  mixed: 'text-[var(--color-warning)] border-[var(--color-warning)]/40',
  none: 'text-muted-foreground border-border',
}

const TITLE: Record<InstanceConsistencyState, string> = {
  same: 'All fills share one strategy instance',
  multiple: 'All fills have an instance; more than one distinct instance ID',
  mixed: 'Some fills have an instance and some do not',
  none: 'No fill in this group has a strategy instance',
}

export function LedgerConsistencyTag({
  state,
  className,
}: {
  state: InstanceConsistencyState
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-sm border px-1',
        'font-mono text-dense-meta leading-none',
        TONE[state],
        className,
      )}
      title={TITLE[state]}
      aria-label={TITLE[state]}
    >
      {MARK[state]}
    </span>
  )
}
