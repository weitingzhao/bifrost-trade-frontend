import { cn } from '@/lib/utils'

/** Technical filter row — tighter gaps; reflow at legacy breakpoints. */
export const screenerTechRowClass = cn(
  'grid w-full min-w-0 grid-cols-1 gap-1.5 items-start [&>*]:min-w-0',
  'min-[721px]:grid-cols-2',
  'min-[1501px]:grid-cols-[minmax(148px,0.9fr)_minmax(200px,1.3fr)_minmax(180px,1.1fr)_minmax(160px,1fr)]',
)

/** Fundamental filter row — tighter gaps; reflow at legacy breakpoints. */
export const screenerFundRowClass = cn(
  'grid w-full min-w-0 grid-cols-1 gap-1.5 items-start [&>*]:min-w-0',
  'min-[601px]:grid-cols-2',
  'min-[1001px]:grid-cols-3',
  'min-[1501px]:grid-cols-[minmax(148px,0.9fr)_minmax(180px,1.05fr)_repeat(3,minmax(0,1fr))]',
)

export const screenerStackColClass = 'flex min-w-0 flex-col gap-1.5'

/** Elevated filter card — compact padding (filters should not dominate the page). */
export const screenerCardClass = cn(
  'h-auto border px-2.5 py-1.5 mat-card',
)

export const screenerCardStackedClass = 'px-2 py-1.5'

/** Cap tall chip stacks so filter columns stay short. */
export const screenerCardStackedChipRowClass = 'max-h-[72px] overflow-y-auto'

export const screenerCardTitleClass =
  'm-0 text-dense-meta font-semibold text-muted-foreground'

export const screenerGroupHeaderClass =
  'mb-0.5 border-b border-border/70 pb-0.5 text-dense-meta font-semibold text-muted-foreground'

export const screenerChipRowClass = 'flex flex-wrap gap-0.5'

/** Condition chips — caption size, lighter than page results. */
export const screenerChipClass = cn(
  'inline-flex cursor-pointer items-center gap-1 border mat-tag',
  'whitespace-nowrap px-1.5 py-0.5 text-dense-caption font-sans font-normal',
  'text-muted-foreground/90 transition-[background,border-color,color] duration-150',
  'hover:text-foreground',
)

export const screenerChipActiveClass = cn(
  'border-lime-400/70 bg-lime-400/10 font-medium text-foreground',
)

export const screenerChipCheckClass = cn(
  'inline-flex h-3 w-3 shrink-0 items-center justify-center rounded-[2px]',
  'border border-border text-dense-micro font-medium text-transparent',
)

export const screenerChipActiveCheckClass =
  'border-primary bg-primary text-primary-foreground'

export const screenerFilterBadgeClass = cn(
  'inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full',
  'bg-primary px-[2px] text-dense-micro font-semibold text-primary-foreground',
)

export const screenerScoreSliderClass = 'h-1 flex-1 cursor-pointer accent-lime-400'

export const screenerDistTechAccentClass = 'border-t border-violet-400/30'

export const screenerDistFundAccentClass = 'border-t border-emerald-400/30'

/** Dist funnel body — scroll so 11 buckets do not stretch the filter row. */
export const screenerDistBodyClass = 'max-h-[148px] overflow-y-auto space-y-0 pr-0.5'
