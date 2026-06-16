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
  'mb-3 flex flex-wrap items-end gap-3',
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

export const HELP_PORTFOLIO_TABLE =
  'Per-account columns use the IB snapshot on this page. Cash (IB) is TotalCashValue; Cash-like is STK lines tagged cash-like (money market, etc.); Cash total is their sum. Positions MV is Σ|qty|×mark across all legs. Host / Secondary rows follow Settings → IB event_host / trading and event_secondary. Total sums every account in the snapshot.'

export const HELP_MAX_DD_SCENARIO =
  'Max drawdown $ = Net liq. × this % for Host / Secondary; Total row uses aggregate net liq. Static risk budget (left tile under slider) = same % × aggregate net liq. Max drawdown (history) (right tile) is from performance history vs NAV.'

export const HELP_CASH_PIE =
  'Each ring splits net liq. into cash total (IB + cash-like STK), STK ex-FI (stock legs not tagged fixed income or cash-like — common underlyings), and other (fixed income, options, etc.). Legend rows pair those slices with Net liq., Ex-FI net liq., and Cash / ex-FI (same row, right column).'

export const sizingDashTitleRowClass = cn(
  'mb-2 flex flex-wrap items-center gap-x-2 gap-y-1',
)

export const sizingDashTitleClass = cn(
  'm-0 text-[0.95rem] font-semibold tracking-tight text-foreground',
)

export const sizingDashTitleInlineClass = cn(sizingDashTitleClass, 'shrink-0')

export const sizingPortfolioRiskToggleClass = cn(
  'ml-auto inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
  'border border-border/80 bg-secondary/60 text-muted-foreground',
  'transition-colors hover:bg-secondary hover:text-foreground',
)

export const sizingPortfolioSummaryClass = cn(
  'mb-2 flex flex-nowrap items-center gap-3 overflow-x-auto rounded-lg border border-border/85 px-2.5 py-2',
  'bg-[color-mix(in_srgb,var(--background)_72%,var(--secondary))]',
)

export const sizingPortfolioSummaryItemClass = cn(
  'flex min-w-0 shrink-0 flex-nowrap items-baseline gap-2 whitespace-nowrap',
)

export const sizingPortfolioSummaryItemMaxDdClass = cn(sizingPortfolioSummaryItemClass, 'ml-auto')

export const sizingPortfolioSummaryNameClass = cn(
  'text-[0.67rem] font-semibold uppercase tracking-wider text-muted-foreground',
)

export const sizingPortfolioSummaryMetricClass = cn(
  'text-[0.78rem] tabular-nums text-foreground',
)

export const sizingPortfolioSummaryMetricValueClass = sizingDashValueHighlightClass

export const sizingPortfolioSummaryMetricEmphClass = cn(
  'text-[0.88rem] font-bold tabular-nums',
  'text-[color-mix(in_srgb,var(--primary)_84%,var(--foreground))]',
)

export const sizingPortfolioMaxDdRowClass = cn(
  'mb-2 grid items-start gap-3',
  'grid-cols-1 lg:grid-cols-[minmax(11rem,2fr)_minmax(11rem,2fr)_minmax(0,8fr)]',
)

export const sizingRangeFieldClass = cn(
  'min-w-0 max-w-full flex-none rounded-[10px] border border-border/85 p-2 px-3',
  'bg-[color-mix(in_srgb,var(--secondary)_92%,transparent)]',
)

export const sizingRangeFieldPortfolioClass = cn(sizingRangeFieldClass, 'max-w-[34rem]')

export const sizingRangeFieldHeadClass = cn(
  'mb-1.5 flex items-baseline justify-between gap-2',
)

export const sizingRangeFieldLabelRowClass = cn(
  'flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5',
)

export const sizingRangeFieldLabelClass = cn(
  'shrink-0 text-xs font-semibold tracking-wide text-muted-foreground',
)

export const sizingRangeFieldReadoutClass = cn(
  'shrink-0 font-mono text-base font-bold tabular-nums leading-none text-primary',
)

export const sizingRangeFieldReadoutUnitClass = cn(
  'ml-px text-[0.72rem] font-semibold opacity-85',
)

export const sizingRangeFieldScaleClass = cn(
  'mt-1 flex justify-between text-[0.65rem] font-medium text-muted-foreground opacity-90',
)

export const sizingRangeFieldMetricsRowClass = cn('mt-2 flex flex-wrap gap-2')

export const sizingRangeFieldMetricsRowSingleClass = cn(
  sizingRangeFieldMetricsRowClass,
  'grid grid-cols-1',
)

export const sizingRangeFieldMetricTileClass = cn(
  'flex min-w-0 flex-1 flex-col gap-0.5 rounded-lg border px-2 py-1.5',
  'border-[color-mix(in_srgb,var(--primary)_42%,var(--border))]',
  'bg-[color-mix(in_srgb,var(--primary)_8%,var(--secondary))]',
  'shadow-[0_0_0_1px_color-mix(in_srgb,var(--primary)_12%,transparent)]',
  'basis-[min(11.5rem,100%)]',
)

export const sizingRangeFieldMetricTileHighlightClass = cn(
  sizingRangeFieldMetricTileClass,
  'border-border bg-secondary shadow-none',
)

export const sizingRangeFieldMetricTileLabelClass = cn(
  'text-[0.64rem] font-semibold uppercase tracking-wider',
  'text-[color-mix(in_srgb,var(--primary)_35%,var(--muted-foreground))]',
)

export const sizingRangeFieldMetricTileValueClass = sizingDashValueHighlightClass

export const sizingRangeFieldMetricTileSubClass = cn(
  'text-[0.66rem] font-medium leading-snug text-muted-foreground',
)

export const sizingPortfolioTableWrapClass = cn('mt-0 min-w-0')

export const sizingPortfolioNumEmphClass = cn(
  'font-semibold tabular-nums tracking-tight',
  'text-[color-mix(in_srgb,var(--primary)_82%,var(--foreground))]',
)

export const sizingCashPieSplitWrapClass = cn(
  'my-3 rounded-[10px] border border-border/85 p-3',
  'bg-[color-mix(in_srgb,var(--secondary)_90%,transparent)]',
)

export const sizingCashPieSplitHeadClass = cn(
  'mb-2 flex flex-wrap items-center gap-x-2 gap-y-1',
)

export const sizingCashPieSplitGridClass = cn(
  'grid grid-cols-[repeat(auto-fit,minmax(15.5rem,1fr))] gap-3',
)

export const sizingCashPiePanelClass = cn(
  'rounded-[10px] border border-border/75 p-2 px-3',
  'bg-[color-mix(in_srgb,var(--background)_55%,transparent)]',
)

export const sizingCashPiePanelTitleClass = cn(
  'mb-2 text-[0.82rem] font-bold uppercase tracking-wider text-muted-foreground',
)

export const sizingCashPiePanelEmptyClass = cn(
  'm-0 text-xs italic leading-snug text-muted-foreground',
)

export const sizingCashPieLayoutClass = cn(
  'flex flex-wrap items-center gap-3',
)

export const sizingCashPieClass = cn('relative h-[7.75rem] w-[7.75rem] shrink-0')

export const sizingCashPieRingClass = cn(
  'absolute inset-0 rounded-full',
  'shadow-[0_4px_18px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.05)]',
)

export const sizingCashPieHoleClass = cn(
  'absolute inset-[17%] flex flex-col items-center justify-center rounded-full',
  'border border-border/85 bg-secondary',
  'shadow-[inset_0_2px_8px_rgba(0,0,0,0.28),0_1px_0_rgba(255,255,255,0.04)]',
)

export const sizingCashPiePctClass = cn(
  'text-base font-bold tabular-nums tracking-tight text-primary',
)

export const sizingCashPiePctStkClass = cn(
  'mt-0.5 text-sm font-bold tabular-nums tracking-tight text-violet-400',
)

export const sizingCashPieHoleLabelClass = cn(
  'mt-0.5 text-[0.62rem] font-bold uppercase tracking-widest text-muted-foreground',
)

export const sizingCashPieLegendClass = cn(
  'min-w-[min(14rem,100%)] flex-1 basis-48',
)

export const sizingCashPieLegendPairedClass = cn(sizingCashPieLegendClass, 'flex flex-col gap-1.5')

export const sizingCashPieLegendPairClass = cn(
  'grid items-start gap-x-3 gap-y-0.5',
  'grid-cols-[minmax(0,1fr)_minmax(7.5rem,max-content)]',
)

export const sizingCashPieLegendPairLeftClass = cn('flex items-start gap-2')

export const sizingCashPieLegendPairRightClass = cn('text-right')

export const sizingCashPieLegendTextClass = cn('text-xs leading-snug text-foreground')

export const sizingCashPieLegendTextTrClass = cn(sizingCashPieLegendTextClass, 'text-right')

export const sizingCashPieLegendValClass = cn('font-mono tabular-nums')

export const sizingCashPieLegendPctClass = cn('text-muted-foreground')

export const sizingCashPieDotClass = cn('mt-1 h-2 w-2 shrink-0 rounded-full')

export const sizingCashPieDotCashClass = cn(
  sizingCashPieDotClass,
  'bg-[color-mix(in_srgb,var(--primary)_88%,#050a10)]',
)

export const sizingCashPieDotStkClass = cn(sizingCashPieDotClass, 'bg-violet-400')

export const sizingCashPieDotRestClass = cn(
  sizingCashPieDotClass,
  'bg-[color-mix(in_srgb,var(--border)_72%,var(--secondary))]',
)
