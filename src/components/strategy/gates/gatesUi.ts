import { cn } from '@/lib/utils'
import { denseTable } from '@/components/data-display/denseTableClasses'

export const gatesActiveGridClass = cn(
  'grid gap-2 text-sm sm:grid-cols-2',
)

export const gatesActiveLabelClass = cn('text-muted-foreground')

export const gatesActiveValueClass = cn('font-medium')

export const gatesActiveIdClass = cn(
  'ml-1 font-mono text-xs text-muted-foreground',
)

export const gatesActiveHintClass = cn(
  'mt-2 text-xs text-muted-foreground',
)

export const gatesSectionTitleClass = denseTable.sectionTitle

export const gatesToolbarClass = cn(
  'flex flex-wrap items-center justify-between gap-x-3 gap-y-2',
)

export const gatesToolbarActionsClass = cn(
  'flex flex-wrap items-center gap-x-2 gap-y-1',
)

export const gatesCountMetaClass = cn(
  'text-dense-meta text-muted-foreground tabular-nums',
)

export const gatesEmptyHintClass = denseTable.emptyHint

export const gatesTableClass = 'min-w-[52rem]'

/** table-fixed column widths — sum ≈ 100% */
export const GATES_TABLE_COL_WIDTHS = {
  id: '8%',
  name: '22%',
  version: '8%',
  dimensions: '30%',
  active: '12%',
  actions: '20%',
} as const

export const gatesIdCellClass = cn(
  'font-mono text-xs text-muted-foreground tabular-nums',
)

export const gatesNameCellClass = cn('font-medium')

export const gatesVersionClass = cn(
  'ml-1.5 font-mono text-xs text-muted-foreground',
)

export const gatesDimensionsCellClass = cn(
  'max-w-0 truncate text-dense-meta text-muted-foreground',
)

export const gatesActiveCellClass = cn('text-center')

export const gatesActionsCellClass = cn('whitespace-nowrap text-right')

export const gatesActionsInnerClass = cn(
  'inline-flex items-center justify-end gap-0.5',
)
