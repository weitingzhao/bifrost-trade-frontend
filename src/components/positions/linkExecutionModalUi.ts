import { cn } from '@/lib/utils'

export const linkExecSectionClass = cn('space-y-2')

export const linkExecSectionLabelClass = cn(
  'text-dense-caption font-semibold uppercase tracking-wider text-muted-foreground',
)

export const linkExecPillsClass = cn('flex flex-wrap gap-2')

export const linkExecPillClass = cn(
  'inline-flex max-w-full cursor-pointer items-center gap-1 border px-3 py-1.5 text-left text-xs mat-tag',
  'transition-colors select-none hover:text-foreground',
)

export const linkExecPillSelectedClass = cn(
  'border-primary bg-primary/10 font-semibold text-primary hover:border-primary hover:bg-primary/10 hover:text-primary',
)

export const linkExecSymbolBadgeClass = cn(
  'ml-1.5 inline-flex border px-1.5 py-0 font-mono text-dense-caption font-semibold text-foreground mat-tag',
)

export const linkExecInstancePanelClass = cn(
  'space-y-3 border p-3 mat-card',
)

export const linkExecSummaryClass = cn(
  'flex flex-wrap items-center gap-1 text-xs text-muted-foreground',
)

export const linkExecHintClass = cn('text-dense-meta text-muted-foreground')

/** Footer: cancel negative margins from DialogFooter when content uses p-0. */
export const linkExecDialogFooterClass = cn(
  'mx-0 mb-0 gap-2 border-t border-border bg-secondary/40 px-5 py-4 pb-5 sm:flex-row sm:justify-end',
)
