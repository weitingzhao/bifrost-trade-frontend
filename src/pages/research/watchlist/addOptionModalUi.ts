import { cn } from '@/lib/utils'

export const addOptionDialogFooterClass = cn(
  'mx-0 mb-0 gap-2 border-t border-border bg-secondary/40 px-5 py-4 pb-5 sm:flex-row sm:justify-end',
)

export const addOptionFormPanelClass = cn(
  'space-y-4 rounded-lg border border-border bg-secondary/30 p-4',
)

export const addOptionFieldLabelClass = cn(
  'text-[10px] font-semibold uppercase tracking-wider text-muted-foreground',
)

export const addOptionSymbolBadgeClass = cn(
  'inline-flex rounded-md border border-border bg-secondary px-2 py-0.5 font-mono text-sm font-semibold text-entity-symbol',
)

export const addOptionPreviewClass = cn(
  'rounded-md border border-border/60 bg-background/60 px-3 py-2 font-mono text-[11px] text-muted-foreground',
)

export const addOptionHintClass = cn('text-[11px] text-muted-foreground')
