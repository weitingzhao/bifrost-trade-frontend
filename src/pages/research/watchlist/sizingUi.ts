import { cn } from '@/lib/utils'

export const HELP_ORDER_SECTION =
  'Danger zone: live bid and editable entry, exit, and share amount feed downstream order sizing. Share amount steps in 100s by default. Verify every field before trading.'

export const HELP_ORDER_RISK_VERIFY =
  'Distance vs bid % = ROUND((Entry - Bid) / Bid, 2) shown as a percent. Positional drawdown = ROUND(Risk per share / Entry price, 2). ATR sheet uses ATR(14) from sizing compute. Order risk ($) uses |Risk per share| × Share amt.'

export const sizingSheetOrderRowClass = cn(
  'mb-4 grid grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,3fr)_minmax(0,9fr)]',
)

export const sizingDashClass = cn(
  'rounded-[10px] border border-border/85 p-3',
  'bg-[color-mix(in_srgb,var(--secondary)_88%,transparent)]',
)

export const sizingDashNestedClass = cn(
  'mt-3 rounded-[10px] border border-border/85 p-3',
  'bg-[color-mix(in_srgb,var(--background)_70%,transparent)]',
)

export const sizingDashRiskVerifyClass = cn(
  sizingDashNestedClass,
  'bg-[color-mix(in_srgb,var(--secondary)_88%,transparent)]',
)

export const sizingDashWorkflowColClass = cn(sizingDashClass, 'mb-0')

export const sizingDashSubtitleClass = cn(
  'mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground',
)

export const sizingDashSubtitleSmClass = cn(sizingDashSubtitleClass, 'text-[10px]')

export const sizingDashHintClass = cn('text-[11px] leading-snug text-muted-foreground')

export const sizingDashFootnoteClass = cn('mt-2 text-[11px] text-muted-foreground')

export const sizingSymbolSheetWrapClass = cn('min-w-0 max-w-full overflow-x-hidden')

export const sizingSheetBlockPromoteClass = cn(
  'space-y-3 border-t border-border pt-3',
)

export const sizingPanelClass = cn(
  'rounded-[10px] border border-border/85 p-3',
  'bg-[color-mix(in_srgb,var(--secondary)_92%,transparent)]',
)

export const sizingPanelHeadClass = cn('mb-3 flex flex-wrap items-center gap-2')

export const sizingPanelTitleClass = cn('text-base font-semibold tracking-tight')

export const sizingPanelControlsClass = cn(
  'mb-3 flex flex-wrap items-end gap-4',
)

export const sizingOrderSectionDangerClass = cn(
  sizingDashNestedClass,
  'border-[color-mix(in_srgb,var(--destructive)_42%,var(--border))]',
  'bg-[color-mix(in_srgb,var(--destructive)_14%,var(--secondary))]',
  'shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--destructive)_22%,transparent)]',
)

export const sizingOrderSectionTitleClass = cn(sizingDashSubtitleClass, 'mb-0 text-destructive')

export const sizingOrderRiskHeadClass = cn('mb-2 flex items-center gap-1.5')

export const sizingOrderBidRowClass = cn(
  'mb-2 flex min-w-0 items-baseline gap-x-2 gap-y-1 overflow-x-auto whitespace-nowrap rounded-md px-2 py-1.5',
  'border border-[color-mix(in_srgb,var(--destructive)_22%,var(--border))]',
  'bg-[color-mix(in_srgb,var(--secondary)_65%,transparent)]',
)

export const sizingOrderBidLabelClass = cn(
  'text-[10px] font-semibold uppercase tracking-wide text-muted-foreground',
)

export const sizingOrderBidValueClass = cn('font-mono text-sm font-semibold tabular-nums')

export const sizingOrderBidSymClass = cn('font-mono text-xs font-semibold text-entity-symbol')

export const sizingOrderCompactGridClass = cn('grid grid-cols-3 gap-2')

export const sizingOrderFieldClass = cn('flex min-w-0 flex-col gap-1')

export const sizingOrderFieldLabelClass = cn(
  'text-[10px] font-semibold uppercase tracking-wide text-muted-foreground',
)

export const sizingOrderFieldHintClass = cn('ml-1 font-normal normal-case text-muted-foreground')

export const sizingOrderFieldInputClass = cn(
  'h-8 rounded-md border border-input bg-secondary px-2 font-mono text-sm tabular-nums text-foreground',
  'outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30',
  'placeholder:text-muted-foreground/70',
)

export const sizingDashCardsClass = cn(
  'grid grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] gap-2',
)

export const sizingDashCardsTightClass = cn(
  'grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-[0.35rem]',
)

export const sizingDashCardClass = cn(
  'flex flex-col rounded-lg border border-border/85 bg-secondary px-3 py-2',
)

export const sizingDashCardHighlightClass = cn(
  'border-border/85 bg-secondary shadow-none',
)

export const sizingDashLabelClass = cn(
  'mb-0.5 block text-[0.68rem] font-semibold uppercase tracking-wide text-muted-foreground',
)

export const sizingDashLabelHighlightClass = cn(
  'mb-[0.22rem] block text-[0.58rem] font-semibold uppercase tracking-[0.06em]',
  'text-[color-mix(in_srgb,var(--primary)_35%,var(--muted-foreground))] opacity-90',
)

export const sizingDashValueClass = cn(
  'block font-mono text-[0.88rem] font-semibold tabular-nums text-foreground',
)

export const sizingDashValueHighlightClass = cn(
  'block font-mono text-[0.9rem] font-bold tabular-nums leading-tight',
  'text-[color-mix(in_srgb,var(--primary)_92%,#f5ffef)]',
)

export const sizingDashValueWarnClass = cn('text-amber-600 dark:text-amber-400')

export const sizingOrderAtrSheetClass = cn(
  'mt-2 rounded-[7px] border border-border/85 p-[0.45rem_0.6rem]',
  'bg-[color-mix(in_srgb,var(--background)_55%,var(--secondary))]',
)

export const sizingOrderAtrSheetGroupClass = cn(sizingOrderAtrSheetClass, 'mt-2')

export const sizingOrderSheetTwoColClass = cn(
  'grid grid-cols-2 gap-[0.35rem] min-[0px]:max-sm:grid-cols-1',
)

export const sizingOrderSheetColClass = cn('grid gap-[0.35rem]')

export const sizingOrderTwoColCardsClass = cn(
  'grid grid-cols-2 gap-[0.35rem] min-[0px]:max-sm:grid-cols-1',
)

export const sizingOrderAtrSheetTitleClass = cn(
  'mb-[0.35rem] text-[0.7rem] font-semibold uppercase tracking-[0.04em] text-muted-foreground',
)

export const sizingOrderMetricSuffixClass = cn(
  'text-[0.74em] font-normal text-[color-mix(in_srgb,var(--primary)_55%,var(--muted-foreground))]',
)

export const sizingKellyRangeBlockClass = cn(
  'w-full min-w-0 flex-1 rounded-[10px] border border-border/80 bg-secondary/40 p-2',
)

export const sizingKellyRangeHeadClass = cn('mb-1 flex items-center justify-between gap-2')

export const sizingKellyRangeLabelClass = cn('text-xs font-medium')

export const sizingKellyRangeReadoutClass = cn('font-mono text-sm font-semibold tabular-nums')

export const sizingKellyRangeScaleClass = cn(
  'mt-0.5 flex justify-between text-[10px] text-muted-foreground',
)

export const sizingKellyExactRowClass = cn('mt-1 flex items-center justify-end gap-2')

export const sizingKellyExactLabelClass = cn('text-[10px] font-semibold text-muted-foreground')

export const sizingKellyExactInputClass = cn(
  'h-7 w-[4.25rem] rounded-md border border-input bg-background px-2 font-mono text-xs tabular-nums',
)

export const sizingRangeElegantClass = cn('h-2 w-full cursor-pointer accent-primary')

export const sizingRowSelectedClass = cn(
  'bg-primary/10 shadow-[inset_3px_0_0_0] shadow-primary hover:bg-primary/[0.14]',
)

export const sizingCapRowFocusClass = cn('bg-primary/10 font-semibold')

export const watchlistStepperSizingHubClass = cn(
  'bg-primary/10 shadow-[inset_0_0_0_1px] shadow-primary/40',
)

export const watchlistStepperSizingHubActiveClass = cn(
  'shadow-[0_0_0_2px] shadow-primary',
)

export const watchlistStepperSizingHubTitleClass = cn(
  'text-[0.82rem] font-extrabold uppercase tracking-wider',
)
