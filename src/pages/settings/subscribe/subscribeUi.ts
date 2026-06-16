import { cn } from '@/lib/utils'
import { denseTable } from '@/components/data-display'

export const subscribeSectionTitleClass = denseTable.sectionTitle

export const subscribeHintClass = cn('text-xs text-muted-foreground max-w-3xl')

export const subscribeInlineCodeClass = cn(
  'rounded bg-muted px-1 py-0.5 font-mono text-dense-meta text-foreground/90',
)

export const subscribeSummaryKClass = cn('text-muted-foreground')

export const subscribeTickerChipsClass = cn('flex flex-wrap gap-1.5')

export const subscribeRefListClass = cn('list-disc space-y-0.5 pl-5 text-xs text-muted-foreground')

export const subscribeMetricTableWrapClass = cn('overflow-x-auto rounded-md border')

export const subscribeRedisKeyCellClass = cn('max-w-[14rem] truncate font-mono text-xs')

export function subscribeAgeBadgeClass(ageSec: number | null): string {
  if (ageSec == null || !Number.isFinite(ageSec)) {
    return 'border-muted-foreground/30 text-muted-foreground'
  }
  if (ageSec < 10) return 'border-success/50 text-success'
  if (ageSec < 60) return 'border-warning/50 text-warning'
  if (ageSec < 300) return 'border-warning/50 text-warning'
  return 'border-danger/50 text-danger'
}

export const subscribeAgeBadgeBaseClass = cn(
  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs tabular-nums',
)

export const subscribeSummaryCardClass = cn(
  'rounded-lg border bg-card p-3 space-y-2 text-sm',
)

export const subscribeSummaryLineClass = cn('flex justify-between gap-2 text-xs')

export const subscribeDataflowClass = cn(
  'rounded-md border bg-muted/20 px-3 py-2 text-xs',
)

export const subscribeDataflowListClass = cn('mt-2 list-disc space-y-1 pl-4 text-muted-foreground')
