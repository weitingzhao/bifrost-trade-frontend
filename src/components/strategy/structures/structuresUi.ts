import { cn } from '@/lib/utils'
import { denseTable } from '@/components/data-display/denseTableClasses'

export const structuresActiveGridClass = cn(
  'grid gap-2 text-sm sm:grid-cols-3',
)

export const structuresActiveLabelClass = cn('text-muted-foreground')

export const structuresActiveValueClass = cn('font-medium')

export const structuresActiveIdClass = cn(
  'ml-1 font-mono text-xs text-muted-foreground',
)

export const structuresActiveHintClass = cn(
  'mt-2 text-xs text-muted-foreground',
)

export const structuresSectionTitleClass = denseTable.sectionTitle

export const structuresToolbarClass = cn(
  'flex flex-wrap items-center justify-between gap-x-3 gap-y-2',
)

export const structuresToolbarActionsClass = cn(
  'flex flex-wrap items-center gap-x-2 gap-y-1',
)

export const structuresToolbarLabelClass = cn(
  'mr-1 shrink-0 text-dense-caption font-semibold uppercase tracking-wide text-muted-foreground',
)

export const structuresEmptyHintClass = denseTable.emptyHint

export const structuresTableClass = 'min-w-[56rem]'

/** table-fixed column widths — sum ≈ 100% */
export const STRUCTURES_TABLE_COL_WIDTHS = {
  name: '16%',
  template: '14%',
  dimensions: '14%',
  legs: '18%',
  constraints: '14%',
  available: '8%',
  inUse: '8%',
  actions: '8%',
} as const

export const structuresNameCellClass = cn('font-medium')

export const structuresVersionClass = cn(
  'ml-1.5 font-mono text-xs text-muted-foreground',
)

export const structuresSummaryCellClass = cn(
  'max-w-0 truncate text-dense-meta text-muted-foreground',
)

export const structuresTemplateCellClass = cn(
  'text-dense-meta text-muted-foreground',
)

export const structuresSwitchCellClass = cn('text-center')

export const structuresActionsCellClass = cn('whitespace-nowrap')

export const structuresActionsInnerClass = cn('inline-flex items-center gap-0.5')

export const structuresInactiveRowClass = 'opacity-70'

export const structuresHistoryFilterRowClass = cn(
  'flex flex-wrap items-center gap-x-2 gap-y-1',
)

export const structuresHistoryTimeCellClass = cn(
  'font-mono text-xs tabular-nums',
)

export const structuresHistoryIdCellClass = cn(
  'font-mono text-xs tabular-nums',
)

export const structuresHistorySummaryCellClass = cn(
  'max-w-md truncate text-dense-meta text-muted-foreground',
)
