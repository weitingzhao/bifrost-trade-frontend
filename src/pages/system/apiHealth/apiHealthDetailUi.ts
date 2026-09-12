import { cn } from '@/lib/utils'

export const apiHealthDetailPanelClass = cn('space-y-4')

export const apiHealthDetailSectionClass = cn('space-y-2')

export const apiHealthDetailTitleClass = cn('text-sm font-medium')

export const apiHealthDetailHintClass = cn('text-xs text-muted-foreground')

export const apiHealthDetailEmptyClass = cn('text-xs italic text-muted-foreground')

export const apiHealthDetailKvRowClass = cn(
  'flex gap-4 border-b py-2 text-xs last:border-0',
)

export const apiHealthDetailKvLabelClass = cn('w-36 shrink-0 text-muted-foreground')

export const apiHealthDetailKvValueClass = cn('min-w-0')

export const apiHealthDetailKvMonoClass = cn('break-all font-mono text-muted-foreground')

export const apiHealthDetailCardContentClass = cn('px-4 py-0')
