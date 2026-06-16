import { cn } from '@/lib/utils'
import { denseTable } from '@/components/data-display'

export const optionScreenerFilterPanelClass = cn(
  'space-y-3 rounded-lg border border-border bg-secondary p-3',
)

export const optionScreenerResultsMetaClass = cn(
  'flex items-center justify-between text-xs text-muted-foreground',
)

export const optionScreenerWarnBoxClass = cn(
  'space-y-0.5 rounded-md border border-amber-500/40 bg-amber-500/10 p-3',
)

export const optionScreenerWarnLineClass = 'text-xs text-amber-700 dark:text-amber-400'

export const optionScreenerSymbolsTextareaClass = cn(
  'min-h-[72px] w-full resize-y rounded-md border border-input bg-background px-3 py-2',
  'font-mono text-xs placeholder:text-muted-foreground',
  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
)

export const optionScreenerNumInputClass = 'h-7 text-xs'

export const optionScreenerScoreTrackClass =
  'h-1.5 w-12 overflow-hidden rounded-full bg-muted'

export const optionScreenerScoreFillClass = 'h-full rounded-full bg-primary'

export const optionScreenerGroupListClass = 'space-y-2'

export const optionScreenerFilterLabelClass = 'text-xs'

export const optionScreenerEmptyHintClass = denseTable.emptyHint
