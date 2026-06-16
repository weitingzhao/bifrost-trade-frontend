import { cn } from '@/lib/utils'
import { denseTable } from '@/components/data-display/denseTableClasses'

export const allocationsActiveGridClass = cn(
  'grid gap-2 text-sm sm:grid-cols-3',
)

export const allocationsActiveLabelClass = cn('text-muted-foreground')

export const allocationsActiveValueClass = cn('font-medium')

export const allocationsActiveIdClass = cn(
  'ml-1 font-mono text-xs text-muted-foreground',
)

export const allocationsActiveHintClass = cn(
  'mt-2 text-xs text-muted-foreground',
)

export const allocationsSectionTitleClass = denseTable.sectionTitle

export const allocationsToolbarClass = cn(
  'flex flex-wrap items-center justify-between gap-x-3 gap-y-2',
)

export const allocationsToolbarActionsClass = cn(
  'flex flex-wrap items-center gap-x-2 gap-y-1',
)

export const allocationsToolbarLabelClass = cn(
  'mr-1 shrink-0 text-dense-caption font-semibold uppercase tracking-wide text-muted-foreground',
)

export const allocationsEmptyHintClass = denseTable.emptyHint

export const allocationsTableClass = 'min-w-[52rem]'

/** table-fixed column widths — sum ≈ 100% */
export const ALLOCATIONS_TABLE_COL_WIDTHS = {
  name: '18%',
  opportunities: '22%',
  gateSafety: '16%',
  maxPos: '10%',
  maxBp: '10%',
  available: '8%',
  inUse: '8%',
  actions: '14%',
} as const

export const allocationsNameCellClass = cn('font-medium')

export const allocationsMetaCellClass = cn(
  'max-w-0 truncate text-dense-meta text-muted-foreground',
)

export const allocationsOppTagsCellClass = cn('flex flex-wrap gap-1')

export const allocationsNumCellClass = cn(
  'text-right font-mono tabular-nums text-dense-meta',
)

export const allocationsSwitchCellClass = cn('text-center')

export const allocationsActiveRowClass = 'bg-yellow-500/5'

export const allocationsInactiveRowClass = 'opacity-60'

export const allocationsActionsCellClass = cn('whitespace-nowrap text-right')

export const allocationsActionsInnerClass = cn(
  'inline-flex items-center justify-end gap-0.5',
)
