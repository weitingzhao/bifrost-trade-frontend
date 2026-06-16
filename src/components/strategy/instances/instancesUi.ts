import { cn } from '@/lib/utils'
import { denseTable } from '@/components/data-display/denseTableClasses'

export const instancesControlsInnerClass = cn(
  'flex flex-wrap items-center gap-x-3 gap-y-1',
)

export const instancesFieldLabelClass = cn(
  'text-dense-caption font-semibold uppercase tracking-wide text-muted-foreground',
)

export const instancesInlineFieldClass = cn('flex min-w-0 items-center gap-1.5')

export const instancesFilterPanelClass = cn('flex flex-col gap-1.5 p-0')

export const instancesFilterPrimaryRowClass = cn(
  'flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border/60 pb-1.5',
)

export const instancesFilterRowClass = cn('flex flex-wrap items-center gap-x-1.5 gap-y-1')

export const instancesFilterLabelClass = cn(
  'mr-0.5 shrink-0 text-dense-caption font-semibold uppercase tracking-wide text-muted-foreground',
)

export const instancesFilterBubbleClass = cn(
  'rounded-full px-2 py-0.5 text-dense-label font-semibold leading-tight transition-colors',
  'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
)

export const instancesFilterBubbleActiveClass = cn(
  'bg-card text-foreground shadow-sm ring-1 ring-border',
)

export const instancesFilterMetaClass = cn(
  'shrink-0 text-dense-caption text-muted-foreground tabular-nums',
)

export const instancesFilterFooterClass = cn(
  'flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/60 pt-1.5',
)

export const instancesToolbarClass = cn('flex flex-wrap items-center gap-x-3 gap-y-1')

export const instancesToolbarLabelClass = cn(
  'mr-0.5 shrink-0 text-dense-caption font-semibold uppercase tracking-wide text-muted-foreground',
)

export const instancesEmptyHintClass = denseTable.emptyHint

export const instancesHeadGroupClass = cn(
  'text-center font-semibold normal-case tracking-normal text-dense-meta',
)

export const instancesHeadSubClass = cn(
  'font-medium normal-case tracking-normal text-dense-meta text-muted-foreground',
)

export const instancesSortBtnClass = cn(
  denseTable.sortableHead,
  'inline-flex max-w-full items-center gap-0.5 border-none bg-transparent p-0 font-inherit text-inherit',
)

export const instancesSortBtnNumClass = 'w-full justify-end'

export const instancesSortHeadActiveClass = 'text-foreground font-semibold'

export const instancesSortCaretClass = 'text-[0.75em] opacity-90'

/** table-fixed column widths — sum ≈ 100% */
export const INSTANCES_TABLE_COL_WIDTHS = {
  id: '3%',
  opp: '24%',
  status: '5%',
  period: '10%',
  net: '6.5%',
  npd: '5.5%',
  und: '6.5%',
  cday: '5.5%',
  ann: '5.5%',
  ret: '5%',
  comm: '5%',
  exec: '3%',
  actions: '7%',
} as const

export const instancesTableClass = 'min-w-[68rem]'

export const instancesColIdClass = 'w-[3%] max-w-none whitespace-nowrap'

export const instancesColOppClass = cn(
  'max-w-none overflow-visible whitespace-normal break-words leading-snug',
)

export const instancesOppCellClass = 'flex min-w-0 flex-col gap-0.5'

export const instancesOppNameClass = cn(
  'min-w-0 text-dense-body font-semibold leading-snug text-option-category-opportunity whitespace-normal break-words [overflow-wrap:anywhere]',
)

export const instancesColStatusClass = 'max-w-none whitespace-nowrap'

export const instancesColPeriodClass = 'whitespace-nowrap max-w-none'

export const instancesPeriodYearClass = 'font-medium'

export const instancesPeriodDaysClass = 'font-bold'

export const instancesActionsCellClass = 'whitespace-nowrap'

export const instancesActionsInnerClass = 'inline-flex items-center gap-0.5'

export const instancesGroupToggleClass = cn(
  'flex w-full items-center gap-2 border-none bg-transparent p-0 text-left font-semibold text-inherit cursor-pointer',
)

export const instancesGroupMutedClass = 'font-normal text-muted-foreground'

export const instancesRowSelectedClass = '[&>td]:bg-primary/8'

export const instancesRowCompareClass = 'bg-blue-500/5'
