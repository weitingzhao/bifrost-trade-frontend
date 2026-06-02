import { cn } from '@/lib/utils'

export const gatesFormScrollClass = cn(
  'flex-1 space-y-4 overflow-y-auto px-6 py-5',
)

export const gatesFormPanelClass = cn(
  'space-y-3 rounded-lg border border-border bg-secondary/20 p-3',
)

export const gatesFormGroupTitleClass = cn('text-sm font-medium')

export const gatesFormGrid3Class = cn('grid grid-cols-3 gap-3')

export const gatesFormGrid4Class = cn('grid grid-cols-4 gap-3')

export const gatesFormFieldClass = cn('space-y-1')

export const gatesFormSubheadingClass = cn(
  'text-xs font-medium uppercase tracking-wide text-muted-foreground',
)

export const gatesFormHintClass = cn('text-xs text-muted-foreground')

export const gatesEarningsRowClass = cn('flex items-center gap-1')

export const gatesFormFooterClass = cn(
  'flex w-full items-center justify-end gap-2',
)
