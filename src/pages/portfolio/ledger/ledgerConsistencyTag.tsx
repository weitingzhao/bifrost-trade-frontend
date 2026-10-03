import { cn } from '@/lib/utils'
import type { TradeConsistencyState } from '@/utils/ledger/ledgerOptHelpers'

const MARK: Record<TradeConsistencyState, string> = {
  same: '=',
  multiple: '⧉',
  mixed: '!',
  none: '○',
}

const TONE: Record<TradeConsistencyState, string> = {
  same: 'text-[var(--color-success)] border-[var(--color-success)]/40',
  multiple: 'text-sky-700 dark:text-sky-400 border-sky-400/40',
  mixed: 'text-[var(--color-warning)] border-[var(--color-warning)]/40',
  none: 'text-muted-foreground border-border',
}

const TITLE: Record<TradeConsistencyState, string> = {
  same: 'All fills share one trade',
  multiple: 'All fills have a trade; more than one distinct trade ID',
  mixed: 'Some fills have a trade and some do not',
  none: 'No fill in this group has a trade',
}

export function LedgerConsistencyTag({
  state,
  className,
}: {
  state: TradeConsistencyState
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
