import { cn } from '@/lib/utils'

export const addOptionDialogFooterClass = cn(
  'mx-0 mb-0 gap-2 border-t border-border bg-secondary/40 px-5 py-4 pb-5 sm:flex-row sm:justify-end',
)

export const addOptionFormPanelClass = cn(
  'space-y-3 border p-3 mat-card',
)

export const addOptionFieldLabelClass = cn(
  'text-dense-caption font-semibold uppercase tracking-wider text-muted-foreground',
)

export const addOptionSymbolBadgeClass = cn(
  'inline-flex border px-2 py-0.5 font-mono text-sm font-semibold text-entity-symbol mat-tag',
)

export const addOptionPreviewClass = cn(
  'border px-3 py-2 font-mono text-dense-meta text-muted-foreground mat-card',
)

export const addOptionHintClass = cn('text-dense-meta text-muted-foreground')
