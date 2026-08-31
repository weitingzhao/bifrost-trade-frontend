import { cn } from '@/lib/utils'
import { denseTable } from '@/components/data-display'

export const watchlistStepperShellClass = cn(
  'mb-4 flex items-stretch gap-0 overflow-hidden rounded-lg border border-border bg-card',
)

export const watchlistStepperStepClass = cn(
  'flex flex-1 items-center gap-[0.65rem] border-none bg-transparent p-[0.65rem_1rem] text-left',
  'cursor-pointer text-muted-foreground transition-[background,color] duration-150 hover:bg-muted',
)

export const watchlistStepperStepActiveClass =
  'bg-primary/10 text-foreground'

export const watchlistStepperStepDoneClass = 'text-foreground'

export const watchlistStepperIndexClass = cn(
  'inline-flex h-[1.35rem] w-[1.35rem] shrink-0 items-center justify-center rounded-full',
  'border border-border text-dense-caption font-bold',
)

export const watchlistStepperIndexActiveClass =
  'border-primary bg-primary/20 text-primary'

export const watchlistStepperTitleClass = 'block text-dense-body font-semibold'

export const watchlistStepperDescClass = 'block text-dense-caption text-muted-foreground'

export const watchlistStepperBadgeClass = cn(
  'ml-auto rounded-full bg-muted px-[0.45rem] py-[0.1rem]',
  'font-mono text-dense-caption font-semibold',
)

export const watchlistStepperConnectorClass =
  'h-0.5 w-6 shrink-0 self-center bg-border'

export const watchlistStepperConnectorDoneClass = 'bg-primary/50'

export const watchlistStockTableClass = cn('min-w-[44rem]')

/** Narrow Sizing-tab symbol sheet — no horizontal scroll in workflow column. */
export const watchlistSizingSheetTableClass = cn('min-w-0 w-full table-fixed')

export const watchlistSizingSheetTableWrapClass = cn(
  'min-w-0 overflow-x-hidden overscroll-x-none',
)

export const watchlistSizingSheetQuoteCellClass = cn(
  'text-right whitespace-normal [overflow-wrap:anywhere]',
)

/** table-fixed column widths — avoid cramped quote / category cells */
export const WATCHLIST_STOCK_COL_WIDTHS = {
  symbol: '10rem',
  quote: '14rem',
  opt: '4.75rem',
  category: '12.5rem',
  actions: '4.75rem',
} as const

export const watchlistOptionTableClass = cn('min-w-[52rem]')

export const WATCHLIST_OPTION_COL_WIDTHS = {
  symbol: '11rem',
  quote: '12rem',
  expiry: '6.5rem',
  right: '3.25rem',
  strike: '6rem',
  category: '12.5rem',
  actions: '3.25rem',
} as const

export const watchlistQuoteCellClass = cn('text-right whitespace-nowrap')

export const watchlistQuoteStackClass = cn(
  'inline-flex flex-col items-end gap-0.5 leading-tight',
)

export const watchlistSizingSheetQuoteStackClass = cn(
  watchlistQuoteStackClass,
  'max-w-full flex-wrap',
)

export const watchlistQuoteLastClass = 'font-mono text-sm font-semibold tabular-nums'

export const watchlistQuoteBaClass = cn(
  'font-mono text-dense-meta tabular-nums',
  denseTable.mutedMeta,
)

export const watchlistCategorySelectClass = cn(
  'h-7 w-full min-w-[11rem] max-w-[14rem] text-xs',
)

export const watchlistOptCellClass = cn('text-center')

export const watchlistPieRingClass =
  'relative h-[5.5rem] w-[5.5rem] shrink-0 rounded-full'

export const watchlistPieHoleClass = cn(
  'absolute inset-[22%] flex flex-col items-center justify-center rounded-full bg-card',
  'text-center text-dense-micro leading-[1.2]',
)

export const watchlistRangeTrackClass = 'w-full accent-primary'

export const watchlistSectionHintClass = 'text-sm text-muted-foreground'

export const watchlistStepLeadClass = 'text-foreground'

export const watchlistKpiCellClass = 'rounded-md border bg-muted/20 p-2 text-xs'

export const watchlistOrderZoneClass = cn(
  'space-y-3 rounded-md border border-destructive/20 bg-destructive/5 p-3',
)

export const watchlistWarnLineClass = 'text-xs text-amber-700 dark:text-amber-400'

export const watchlistWarnBoxClass = watchlistWarnLineClass

export const watchlistPiePanelClass = 'space-y-2 rounded-lg border p-3'

export const watchlistCollapsedSummaryClass = cn(
  'flex flex-wrap gap-3 px-3 pb-3 pt-0 text-xs text-muted-foreground',
)

export const watchlistRiskBodyClass = 'space-y-3 px-3 pb-3 pt-0'
