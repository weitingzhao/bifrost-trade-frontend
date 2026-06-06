import { cn } from '@/lib/utils'
import { denseTable } from '@/components/data-display/denseTableClasses'

export const winRatePageSectionClass = cn('flex flex-col gap-2')

export const winRateStructureGridClass = cn(
  'grid grid-cols-[repeat(auto-fill,minmax(14.5rem,1fr))] gap-2 items-stretch',
  'md:grid-cols-[repeat(auto-fill,minmax(15.5rem,1fr))]',
  'xl:grid-cols-[repeat(auto-fill,minmax(16rem,1fr))]',
)

export const winRateCardClass = cn(
  'max-w-full min-w-0 w-full overflow-hidden text-left font-inherit text-inherit',
)

/** Legacy `strategy-win-rate-card--clickable` — border + accent lift on hover. */
export const winRateCardClickableClass = cn(
  winRateCardClass,
  'cursor-pointer appearance-none border text-left',
  'transition-[border-color,box-shadow,background-color] duration-150',
  'hover:border-primary/40 hover:bg-card',
  'hover:shadow-[0_4px_14px_-4px_rgba(0,0,0,0.35),0_0_0_1px_color-mix(in_srgb,var(--primary)_16%,transparent)]',
  'active:scale-[0.995] active:shadow-sm',
  'focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2',
  'disabled:cursor-default',
)

export const winRateStructureCardShellClass = cn(
  'gap-0 p-2.5',
)

export const winRateCardTitleClass = cn(
  'mb-1.5 truncate text-[0.88rem] font-semibold leading-tight',
)

export const winRateSectionClass = cn(
  '[&+&]:mt-1.5 [&+&]:border-t [&+&]:border-border [&+&]:pt-1.5',
)

export const winRateSectionLabelClass = cn(
  'mb-1 text-[0.62rem] font-semibold uppercase tracking-wide text-muted-foreground',
)

export const winRateKpiGridClass = cn('grid grid-cols-2 gap-1.5 min-w-0')

export const winRateKpiShellClass = cn(
  'flex min-w-0 flex-col gap-0.5 rounded-md border border-border bg-card px-1.5 py-1',
)

export const winRateKpiHighlightClass = cn(
  'border-primary/35 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--ring)_12%,transparent)]',
)

export const winRateKpiLabelClass = cn(
  'text-[0.65rem] leading-tight text-muted-foreground',
)

export const winRateKpiValueClass = cn(
  'text-[1.05rem] font-bold tabular-nums leading-tight text-foreground',
)

export const winRateKpiWinPctValueClass = cn(
  'text-[1.12rem] font-bold tracking-tight',
)

export const winRateKpiLabelCompactClass = cn(
  'text-[0.58rem] leading-snug text-muted-foreground',
)

export const winRateKpiValueCompactClass = cn(
  'text-[0.8rem] font-bold tabular-nums leading-tight text-foreground',
)

export const winRateMetrics3Class = cn(
  'grid grid-cols-3 gap-1.5 min-w-0 max-[380px]:grid-cols-1',
)

export const winRateMetricClass = cn('flex min-w-0 flex-col gap-0.5')

export const winRateMetricLabelClass = cn(
  'text-[0.65rem] leading-tight text-muted-foreground',
)

export const winRateMetricValueClass = cn(
  'text-[0.82rem] font-bold tabular-nums leading-snug',
)

export const winRateMetricValuePnlClass = cn('text-[0.82rem]')

export const winRateUnderlyingRowsClass = cn('grid grid-cols-1 gap-1.5')

export const winRateUnderlyingRowClass = cn(
  'flex min-h-0 flex-row items-baseline justify-between gap-2',
)

export const winRateUnderlyingRowLabelClass = cn(
  'shrink-0 text-[0.75rem] leading-snug text-muted-foreground',
)

export const winRateUnderlyingRowValueClass = cn(
  'min-w-0 flex-1 text-right text-[0.95rem] font-bold tabular-nums leading-snug',
)

export const winRateMetricsWrapClass = cn('flex flex-wrap gap-x-1.5 gap-y-1')

export const winRateMetricsWrapItemClass = cn(
  'min-w-[calc(50%-0.2rem)] flex-[1_1_calc(50%-0.2rem)]',
)

export const winRateTotalsPanelClass = cn(
  'overflow-x-auto overflow-y-hidden rounded-lg border border-border bg-secondary',
)

export const winRateTotalsRowClass = cn(
  'grid min-w-[min(100%,44rem)] grid-cols-[3fr_2fr_2fr_5fr] items-stretch gap-0 p-2.5',
  'max-md:min-w-0 max-md:grid-cols-1 max-md:gap-y-2 max-md:p-2',
)

export const winRateTotalsBandClass = cn(
  'flex min-w-0 flex-col gap-1.5 px-2',
  'first:pl-0',
  '[&:not(:last-child)]:border-r [&:not(:last-child)]:border-border',
  'max-md:px-0 max-md:pb-2 max-md:[&:not(:last-child)]:border-r-0 max-md:[&:not(:last-child)]:border-b max-md:[&:not(:last-child)]:border-border',
  'max-md:last:pb-0 max-md:last:border-b-0',
)

export const winRateTotalsSectionClass = cn('flex flex-col')

export const winRateTotalsSectionLabelClass = cn(
  'mb-1 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground',
)

export const winRateTotalsBandMetricPnlClass = cn('text-[0.88rem]')

export const winRateTotalsBandUnderlyingLabelClass = cn('text-[0.65rem]')

export const winRateTotalsBandUnderlyingValueClass = cn('text-[0.88rem]')

export const winRateAveragesTotalsClass = cn(
  'grid grid-cols-3 grid-rows-2 grid-flow-col content-start gap-x-1.5 gap-y-1',
  'max-md:grid-flow-row max-md:grid-cols-2 max-md:grid-rows-none',
)

export const winRateHintClass = denseTable.mutedMeta

export const winRateEmptyHintClass = denseTable.emptyHint

export const winRateSinceLabelClass = cn(
  'mr-1 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground',
)

/** Win % color: strictly >50% green, strictly <50% red; 50% or no trades neutral. */
export function winRateWinPctClass(total: number, wins: number): string {
  if (total <= 0) return 'text-muted-foreground'
  const pct = (wins / total) * 100
  if (pct > 50) return 'text-emerald-600 dark:text-emerald-400'
  if (pct < 50) return 'text-red-600 dark:text-red-400'
  return 'text-muted-foreground'
}
