import { cn } from '@/lib/utils'
import { denseTable } from '@/components/data-display/denseTableClasses'

export const optionDiscoveryChartWrapClass = cn(
  'min-w-0 rounded-lg border border-border bg-secondary/30 p-2',
  '[&_.od-chart-svg]:block [&_.od-chart-svg]:h-auto [&_.od-chart-svg]:w-full [&_.od-chart-svg]:max-w-full [&_.od-chart-svg]:aspect-[640/260]',
)

export const optionDiscoveryMaxPainSectionClass = 'space-y-3'

export const optionDiscoveryMaxPainHeaderRowClass =
  'flex flex-wrap items-start justify-between gap-2'

export const optionDiscoveryMaxPainTitleClass =
  'm-0 inline-flex flex-wrap items-center gap-1.5 text-base font-medium'

export const optionDiscoveryMaxPainTitleExpClass = 'font-normal text-muted-foreground'

export const optionDiscoveryMaxPainHeaderActionsClass = 'flex shrink-0 items-center gap-1'

export const optionDiscoveryMaxPainChartCellClass = optionDiscoveryChartWrapClass

export const optionDiscoveryMaxPainCorpWarnClass = 'mt-0'

export const optionDiscoveryMaxPainDisclaimerDetailsClass = 'rounded-md border border-border/60 px-3 py-2'

export const optionDiscoveryMaxPainDisclaimerSummaryClass =
  'cursor-pointer text-xs font-semibold text-muted-foreground'

export const optionDiscoveryMaxPainDisclaimerBodyClass = 'mt-2 text-xs leading-snug text-muted-foreground'

export const optionDiscoveryExpiryBubbleBaseClass = cn(
  'inline-flex flex-col items-center gap-0.5 rounded-full border px-2.5 py-1',
  'border-border/80 bg-secondary text-foreground transition-colors',
  'hover:border-primary/35 hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-50',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
)

export const optionDiscoveryExpiryBubbleSelectedClass =
  'border-primary/55 bg-accent/15'

export const optionDiscoveryCardSectionClass = cn(
  'min-w-0 rounded-lg border border-border p-2 px-3',
  'bg-[color-mix(in_srgb,var(--card)_88%,var(--foreground)_12%)]',
)

export const optionDiscoveryCardGridClass =
  'grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-3'

export const optionDiscoveryCardSectionTitleClass = cn(
  'mb-2 text-[0.7rem] font-bold uppercase tracking-wide text-muted-foreground',
)

export const optionDiscoveryKvGridClass = cn(
  'grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs tabular-nums',
)

export const optionDiscoveryKvKeyClass = 'font-medium whitespace-nowrap text-muted-foreground'

export const optionDiscoveryKvValueClass = 'text-right font-semibold text-foreground'

export const optionDiscoveryKvDimClass = 'text-[0.7rem] font-normal text-muted-foreground'

export const optionDiscoveryTradabilityScoreClass = 'mb-2 flex items-baseline gap-1.5'

export const optionDiscoveryTradabilityValueBaseClass =
  'text-[1.8rem] font-extrabold tabular-nums leading-none'

export function optionDiscoveryTradabilityValueClass(score: number): string {
  if (score >= 60) return cn(optionDiscoveryTradabilityValueBaseClass, 'text-emerald-600 dark:text-emerald-400')
  if (score >= 30) return cn(optionDiscoveryTradabilityValueBaseClass, 'text-amber-600 dark:text-amber-400')
  return cn(optionDiscoveryTradabilityValueBaseClass, 'text-destructive')
}

export const optionDiscoveryTradabilityLabelClass = 'text-[0.8rem] text-muted-foreground'

export const optionDiscoveryTradabilityFactorsClass = 'flex flex-col gap-0.5'

export const optionDiscoveryTradabilityFactorClass =
  'flex items-baseline justify-between gap-2 text-xs'

export const optionDiscoveryExecGuidanceClass = cn(
  'mt-3 flex flex-wrap items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[0.7rem]',
)

export const optionDiscoveryExecGuidanceTitleClass = cn(
  'mr-1 font-bold uppercase tracking-wide text-muted-foreground',
)

export const optionDiscoveryDetailChartHintClass = 'mb-2 mt-0'

export const optionDiscoveryDetailRootClass = 'optionContractDetail'

export const optionDiscoveryScenarioWrapClass = 'min-w-0 overflow-x-auto'

export const optionDiscoveryEmptyHintClass = denseTable.emptyHint
