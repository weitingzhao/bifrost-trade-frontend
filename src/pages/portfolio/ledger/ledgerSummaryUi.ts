import { cn } from '@/lib/utils'
import { denseTable } from '@/components/data-display/denseTableClasses'

export const ledgerSummary = {
  section: cn(
    'rounded-[10px] border border-border bg-muted/25 px-4 py-3',
    'shadow-[inset_0_1px_0_color-mix(in_srgb,var(--foreground)_4%,transparent)]',
  ),
  head: 'mb-3 flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-2',
  title: 'shrink-0 text-dense-body font-semibold text-muted-foreground',
  body: 'flex w-full min-w-0 flex-wrap items-stretch gap-3',
  calendarGrid: cn(
    'm-0 grid min-w-0 flex-[1_1_14rem] list-none gap-2 p-0',
    'grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] content-start',
  ),
  periodCell: cn(
    'flex min-h-[3.25rem] min-w-0 flex-col items-start gap-0.5',
    'rounded-lg border border-border bg-secondary/40 px-3 py-2',
    'shadow-sm',
  ),
  periodCellLabel: cn(
    'font-mono text-dense-meta font-semibold tabular-nums',
    'tracking-wide text-muted-foreground leading-tight',
  ),
  periodCellMetrics: cn(
    'inline-flex flex-wrap items-baseline gap-[0.35em]',
    'text-dense-body leading-snug text-muted-foreground',
  ),
  stocksNotionalLine: cn(
    'mt-0.5 block text-left font-mono text-dense-meta tabular-nums',
    'leading-tight text-muted-foreground',
  ),
  metricSep: 'select-none text-border',
  metricInlineLabel: 'text-xs text-muted-foreground',
  metricTrigger: cn(
    'cursor-help border-0 bg-transparent p-0 font-[inherit] tabular-nums',
    'underline decoration-dotted underline-offset-2 hover:underline',
  ),
  notionalValue: 'font-mono font-medium text-foreground underline decoration-dotted underline-offset-2',
  summaryTotal: cn(
    'ml-auto flex min-w-[min(100%,11rem)] flex-[0_1_auto] flex-col items-start justify-center gap-0.5',
    'self-stretch rounded-lg border border-border/90 px-3 py-2',
    'bg-gradient-to-br from-muted/40 to-muted/15',
  ),
  summaryTotalLabel: cn(
    'text-dense-meta font-bold uppercase tracking-wider text-muted-foreground',
  ),
  summaryTotalMetrics: cn(
    'inline-flex flex-wrap items-baseline gap-[0.35em]',
    'text-dense-body leading-snug text-foreground',
  ),
  emptyHint: denseTable.emptyHint,
} as const
