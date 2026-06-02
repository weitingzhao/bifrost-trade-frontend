import { cn } from '@/lib/utils'
import { denseTable } from '@/components/data-display/denseTableClasses'

export const opportunitiesSectionTitleClass = denseTable.sectionTitle

export const opportunitiesToolbarClass = cn(
  'flex flex-wrap items-center justify-between gap-x-3 gap-y-2',
)

export const opportunitiesToolbarActionsClass = cn(
  'flex flex-wrap items-center gap-x-2 gap-y-1',
)

export const opportunitiesToolbarLabelClass = cn(
  'mr-1 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground',
)

export const opportunitiesEmptyHintClass = denseTable.emptyHint

export const opportunitiesTableClass = 'min-w-[48rem]'

/** table-fixed column widths — sum ≈ 100% */
export const OPPORTUNITIES_TABLE_COL_WIDTHS = {
  name: '22%',
  structure: '18%',
  scope: '22%',
  gate: '18%',
  available: '8%',
  actions: '12%',
} as const

export const opportunitiesNameCellClass = cn('font-medium')

export const opportunitiesMetaCellClass = cn(
  'text-[length:var(--text-dense-meta)] text-muted-foreground',
)

export const opportunitiesScopeCellClass = cn(
  'max-w-0 truncate text-[length:var(--text-dense-meta)]',
)

export const opportunitiesSwitchCellClass = cn('text-center')

export const opportunitiesActionsCellClass = cn('whitespace-nowrap text-right')

export const opportunitiesActionsInnerClass = cn(
  'inline-flex items-center justify-end gap-0.5',
)
