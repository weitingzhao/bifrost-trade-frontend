import { cn } from '@/lib/utils'
import { denseTable } from '@/components/data-display'

export const tradesControlsInnerClass = cn(
  'flex flex-wrap items-center gap-x-3 gap-y-1',
)

export const tradesFieldLabelClass = cn(
  'text-dense-caption font-semibold uppercase tracking-wide text-muted-foreground',
)

export const tradesInlineFieldClass = cn('flex min-w-0 items-center gap-1.5')

export const tradesFilterPanelClass = cn('flex flex-col gap-1.5 p-0')

export const tradesFilterPrimaryRowClass = cn(
  'flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border/60 pb-1.5',
)

export const tradesFilterRowClass = cn('flex flex-wrap items-center gap-x-1.5 gap-y-1')

export const tradesFilterLabelClass = cn(
  'mr-0.5 shrink-0 text-dense-caption font-semibold uppercase tracking-wide text-muted-foreground',
)

export const tradesFilterBubbleClass = cn(
  'rounded-full px-2 py-0.5 text-dense-label font-semibold leading-tight transition-colors',
  'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
)

export const tradesFilterBubbleActiveClass = cn(
  'bg-card text-foreground shadow-sm ring-1 ring-border',
)

export const tradesFilterMetaClass = cn(
  'shrink-0 text-dense-caption text-muted-foreground tabular-nums',
)

export const tradesFilterFooterClass = cn(
  'flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/60 pt-1.5',
)

export const tradesToolbarClass = cn('flex flex-wrap items-center gap-x-3 gap-y-1')

export const tradesToolbarLabelClass = cn(
  'mr-0.5 shrink-0 text-dense-caption font-semibold uppercase tracking-wide text-muted-foreground',
)

export const tradesEmptyHintClass = denseTable.emptyHint

export const tradesHeadGroupClass = cn(
  'text-center font-semibold normal-case tracking-normal text-dense-meta',
)

export const tradesHeadSubClass = cn(
  'font-medium normal-case tracking-normal text-dense-meta text-muted-foreground',
)

export const tradesSortBtnClass = cn(
  denseTable.sortableHead,
  'inline-flex max-w-full items-center gap-0.5 border-none bg-transparent p-0 font-inherit text-inherit',
)

export const tradesSortBtnNumClass = 'w-full justify-end'

export const tradesSortHeadActiveClass = 'text-foreground font-semibold'

export const tradesSortCaretClass = 'text-[0.75em] opacity-90'

/** table-fixed column widths — sum ≈ 100% */
export const TRADES_TABLE_COL_WIDTHS = {
  actions: '7%',
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
} as const

export const tradesTableClass = 'min-w-[68rem]'

export const tradesColIdClass = 'w-[3%] max-w-none whitespace-nowrap'

export const tradesColOppClass = cn(
  'max-w-none overflow-visible whitespace-normal break-words leading-snug',
)

export const tradesOppCellClass = 'flex min-w-0 flex-col gap-0.5'

export const tradesOppNameClass = cn(
  'min-w-0 text-dense-body font-semibold leading-snug text-option-category-opportunity whitespace-normal break-words [overflow-wrap:anywhere]',
)

export const tradesColStatusClass = 'max-w-none whitespace-nowrap'

export const tradesColPeriodClass = 'whitespace-nowrap max-w-none'

export const tradesPeriodYearClass = 'font-medium'

export const tradesPeriodDaysClass = 'font-bold'

export const tradesActionsCellClass = cn(
  'sticky left-0 z-[1] whitespace-nowrap bg-card',
)

export const tradesActionsInnerClass = 'inline-flex items-center gap-0.5'

export const tradesGroupToggleClass = cn(
  'flex w-full items-center gap-2 border-none bg-transparent p-0 text-left font-semibold text-inherit cursor-pointer',
)

export const tradesGroupMutedClass = 'font-normal text-muted-foreground'

/** Active detail row — left accent + tint so it stands out from peers. */
export const tradesRowSelectedClass = cn(
  '[&>td]:bg-primary/12',
  '[&>td:first-child]:shadow-[inset_3px_0_0_0] [&>td:first-child]:shadow-primary',
)

export const tradesRowCompareClass = 'bg-blue-500/5'
