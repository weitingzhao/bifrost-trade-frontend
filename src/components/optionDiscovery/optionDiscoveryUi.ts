import { cn } from '@/lib/utils'
import { denseTable } from '@/components/data-display'

export const optionDiscoveryExpiryBubbleBaseClass = cn(
  'inline-flex flex-col items-center gap-0.5 rounded-full border px-2.5 py-1',
  'border-border/80 bg-secondary text-foreground transition-colors',
  'hover:border-primary/35 hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-50',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
)

export const optionDiscoveryExpiryBubbleSelectedClass =
  'border-primary/55 bg-accent/15'

// Rev .142: group material — no frame, the card fill and radius.
export const optionDiscoveryCardSectionClass = 'min-w-0 border p-2 px-3 mat-card'

export const optionDiscoveryCardGridClass =
  'grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-3'

export const optionDiscoveryCardSectionTitleClass = cn(
  'mb-2 text-dense-meta font-bold uppercase tracking-wide text-muted-foreground',
)

export const optionDiscoveryKvGridClass = cn(
  'grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs tabular-nums',
)

export const optionDiscoveryKvKeyClass = 'font-medium whitespace-nowrap text-muted-foreground'

export const optionDiscoveryKvValueClass = 'text-right font-semibold text-foreground'

export const optionDiscoveryKvDimClass = 'text-dense-meta font-normal text-muted-foreground'

export const optionDiscoveryTradabilityScoreClass = 'mb-2 flex items-baseline gap-1.5'

export const optionDiscoveryTradabilityValueBaseClass =
  'text-[1.8rem] font-extrabold tabular-nums leading-none'

export function optionDiscoveryTradabilityValueClass(score: number): string {
  if (score >= 60) return cn(optionDiscoveryTradabilityValueBaseClass, 'text-success')
  if (score >= 30) return cn(optionDiscoveryTradabilityValueBaseClass, 'text-warning')
  return cn(optionDiscoveryTradabilityValueBaseClass, 'text-destructive')
}

export const optionDiscoveryTradabilityLabelClass = 'text-dense-body text-muted-foreground'

export const optionDiscoveryTradabilityFactorsClass = 'flex flex-col gap-0.5'

export const optionDiscoveryTradabilityFactorClass =
  'flex items-baseline justify-between gap-2 text-xs'

export const optionDiscoveryExecGuidanceClass = cn(
  'mt-3 flex flex-wrap items-center gap-1 border px-2 py-1 text-dense-meta mat-card',
)

export const optionDiscoveryExecGuidanceTitleClass = cn(
  'mr-1 font-bold uppercase tracking-wide text-muted-foreground',
)

export const optionDiscoveryDetailChartHintClass = 'mb-2 mt-0'

export const optionDiscoveryDetailRootClass = 'optionContractDetail'

export const optionDiscoveryScenarioWrapClass = 'min-w-0 overflow-x-auto'

export const optionDiscoveryEmptyHintClass = denseTable.emptyHint
