import { cn } from '@/lib/utils'

/** Technical filter row — full viewport width; reflow at legacy breakpoints. */
export const screenerTechRowClass = cn(
  'grid w-full min-w-0 grid-cols-1 gap-3 items-stretch [&>*]:min-w-0',
  'min-[721px]:grid-cols-2',
  'min-[1501px]:grid-cols-[minmax(168px,0.95fr)_minmax(220px,1.35fr)_minmax(200px,1.15fr)_minmax(180px,1fr)]',
)

/** Fundamental filter row — full viewport width; reflow at legacy breakpoints. */
export const screenerFundRowClass = cn(
  'grid w-full min-w-0 grid-cols-1 gap-3 items-stretch [&>*]:min-w-0',
  'min-[601px]:grid-cols-2',
  'min-[1001px]:grid-cols-3',
  'min-[1501px]:grid-cols-[minmax(168px,0.95fr)_minmax(200px,1.1fr)_repeat(3,minmax(0,1fr))]',
)

export const screenerStackColClass = 'flex min-w-0 flex-col gap-2'

/** Elevated filter card on PageShell canvas. */
export const screenerCardClass = cn(
  'h-full rounded-[10px] border border-border bg-secondary p-3 shadow-sm',
  'sm:px-4 sm:py-3',
)

export const screenerCardStackedClass = 'px-3 py-2 sm:px-3 sm:py-2'

export const screenerCardStackedChipRowClass = 'max-h-[120px] overflow-y-auto'

export const screenerCardTitleClass =
  'm-0 text-dense-label font-bold uppercase tracking-[0.08em] text-[var(--color-text-dim,#5c6572)]'

export const screenerGroupHeaderClass =
  'mb-1 border-b border-border pb-1 text-dense-caption font-extrabold uppercase tracking-[0.07em]'

export const screenerChipRowClass = 'flex flex-wrap gap-1'

export const screenerChipClass = cn(
  'inline-flex cursor-pointer items-center gap-0.5 rounded border border-border',
  'bg-[rgba(26,31,38,0.6)] px-1.5 py-0.5 text-dense-caption text-muted-foreground',
  'transition-[background,border-color,color] duration-150',
  'hover:bg-[rgba(26,31,38,0.9)] hover:text-foreground',
)

export const screenerChipActiveClass = cn(
  'border-lime-400 bg-lime-400/10 font-semibold text-foreground',
)

export const screenerChipCheckClass = cn(
  'inline-flex h-[0.85rem] w-[0.85rem] items-center justify-center rounded-[3px]',
  'border border-[var(--color-border-strong,#3d4754)] text-dense-caption font-bold text-transparent',
)

export const screenerChipActiveCheckClass =
  'border-lime-400 bg-lime-400 text-[#0a0c0f]'

export const screenerFilterBadgeClass = cn(
  'inline-flex h-[1.1rem] min-w-[1.1rem] items-center justify-center rounded-full',
  'bg-lime-400 px-[3px] text-dense-micro font-bold text-[#0a0c0f]',
)

export const screenerScoreSliderClass = 'h-1 flex-1 cursor-pointer accent-lime-400'

export const screenerDistTechAccentClass = 'border-t-2 border-violet-400/35'

export const screenerDistFundAccentClass = 'border-t-2 border-emerald-400/35'
