import { DENSE_TAG_SHELL } from '@bifrost/ui'
import { cn } from '@/lib/utils'

/**
 * Dense UI tag variants. The capsule — no frame, the variant's own ink at 15%
 * behind it, fully round, 8px sides — is @bifrost/ui's since 0.5.0
 * (`DENSE_TAG_SHELL`); this app adds the variants the package has no word for
 * (entity inks, fill sources). The variant sets only the ink; the fill
 * follows it through currentColor.
 */
export type DenseTagVariant =
  | 'category'
  | 'symbol'
  | 'strategy'
  | 'instance'
  | 'success'
  | 'warning'
  | 'danger'
  | 'neutral'
  | 'info'
  | 'source-flex'
  | 'source-tws'
  | 'source-journal'
  | 'source-manual'
  | 'source-muted'

export type DenseTagSize = 'cell' | 'pill'

const shellBySize: Record<DenseTagSize, string> = DENSE_TAG_SHELL

const variantByType: Record<DenseTagVariant, Record<DenseTagSize, string>> = {
  category: {
    cell: 'text-entity-category font-medium',
    pill: 'text-entity-category font-semibold',
  },
  symbol: {
    cell: 'text-entity-symbol font-semibold',
    pill: 'text-entity-symbol font-bold tracking-wide',
  },
  strategy: {
    cell: 'text-entity-strategy font-semibold',
    pill: 'text-entity-strategy font-semibold',
  },
  instance: {
    cell: 'text-entity-instance font-mono font-semibold',
    pill: 'text-entity-instance font-mono font-semibold',
  },
  success: {
    cell: 'text-emerald-600 dark:text-emerald-400',
    pill: 'text-emerald-600 dark:text-emerald-400',
  },
  warning: {
    cell: 'text-[var(--sk-warn)]',
    pill: 'text-[var(--sk-warn)]',
  },
  danger: {
    cell: 'text-red-600 dark:text-red-400',
    pill: 'text-red-600 dark:text-red-400',
  },
  neutral: {
    cell: 'text-muted-foreground',
    pill: 'text-muted-foreground',
  },
  info: {
    cell: 'text-sky-700 dark:text-sky-400',
    pill: 'text-sky-700 dark:text-sky-400',
  },
  'source-flex': {
    cell: 'text-emerald-700 dark:text-emerald-400 font-mono text-xs font-semibold',
    pill: 'text-emerald-700 dark:text-emerald-400 font-mono text-xs font-semibold',
  },
  'source-tws': {
    cell: 'text-sky-700 dark:text-sky-400 font-mono text-xs font-semibold',
    pill: 'text-sky-700 dark:text-sky-400 font-mono text-xs font-semibold',
  },
  'source-journal': {
    cell: 'text-[var(--sk-warn)] font-mono text-xs font-semibold',
    pill: 'text-[var(--sk-warn)] font-mono text-xs font-semibold',
  },
  'source-manual': {
    cell: 'text-violet-700 dark:text-violet-400 font-mono text-xs font-semibold',
    pill: 'text-violet-700 dark:text-violet-400 font-mono text-xs font-semibold',
  },
  'source-muted': {
    cell: 'text-muted-foreground font-mono text-xs font-semibold',
    pill: 'text-muted-foreground font-mono text-xs font-semibold',
  },
}

export function denseTagClass(
  variant: DenseTagVariant = 'category',
  size: DenseTagSize = 'cell',
  className?: string,
): string {
  return cn(shellBySize[size], variantByType[variant][size], className)
}

/** Toggleable filter chip for entity values — same token as table GroupHeaderRow / cell tags. */
export type DenseEntityFilterVariant = 'category' | 'symbol' | 'strategy' | 'instance'

const entityFilterInactiveClass =
  'rounded-md border-border bg-secondary/60 font-medium text-muted-foreground opacity-100 hover:bg-secondary hover:text-foreground hover:opacity-100'

const entityFilterActiveClass: Record<DenseEntityFilterVariant, string> = {
  category:
    'rounded-md border-entity-category/50 text-entity-category opacity-100 hover:opacity-100 ring-1 ring-[color-mix(in_oklch,var(--color-entity-category)_45%,transparent)] bg-[color-mix(in_oklch,var(--color-entity-category)_14%,transparent)]',
  symbol:
    'rounded-md border-entity-symbol/50 text-entity-symbol opacity-100 hover:opacity-100 ring-1 ring-[color-mix(in_oklch,var(--color-entity-symbol)_45%,transparent)] bg-[color-mix(in_oklch,var(--color-entity-symbol)_14%,transparent)]',
  strategy:
    'rounded-md border-entity-strategy/50 text-entity-strategy opacity-100 hover:opacity-100 ring-1 ring-[color-mix(in_oklch,var(--color-entity-strategy)_45%,transparent)] bg-[color-mix(in_oklch,var(--color-entity-strategy)_14%,transparent)]',
  instance:
    'rounded-md border-entity-instance/50 text-entity-instance opacity-100 hover:opacity-100 ring-1 ring-[color-mix(in_oklch,var(--color-entity-instance)_45%,transparent)] bg-[color-mix(in_oklch,var(--color-entity-instance)_14%,transparent)]',
}

export function denseEntityFilterChipClass(
  variant: DenseEntityFilterVariant,
  active: boolean,
): string {
  return cn(
    'inline-flex items-center gap-1 transition-colors',
    active ? entityFilterActiveClass[variant] : entityFilterInactiveClass,
  )
}

export function denseTagVariantFromTone(tone: 'brightOk' | 'warn' | 'bad'): DenseTagVariant {
  if (tone === 'brightOk') return 'success'
  if (tone === 'warn') return 'warning'
  return 'danger'
}

export function denseTagVariantFromExecSource(source: string): DenseTagVariant {
  const norm = source.trim().toLowerCase()
  if (norm === 'flex_trades' || norm === 'flex') return 'source-flex'
  if (norm === 'tws_event' || norm === 'tws_client') return 'source-tws'
  if (norm === 'journal_closed') return 'source-journal'
  if (norm === 'manual') return 'source-manual'
  return 'source-muted'
}

/** @deprecated Use DenseTag variant="category" */
export const denseCategoryTagCellClass = denseTagClass('category', 'cell')

/** @deprecated Use DenseTag variant="category" size="pill" */
export const denseCategoryTagPillClass = denseTagClass('category', 'pill')

/** @deprecated Use DenseTag variant="symbol" */
export const denseSymbolTagCellClass = denseTagClass('symbol', 'cell')

/** @deprecated Use DenseTag variant="symbol" size="pill" */
export const denseSymbolTagPillClass = denseTagClass('symbol', 'pill')

/** Option Category text in table identity columns — token color only, no pill border. */
export type DenseOptionCategoryVariant = 'strategy' | 'instance' | 'opportunity' | 'structure'

const optionCategoryLabelByVariant: Record<DenseOptionCategoryVariant, string> = {
  strategy: 'font-semibold text-entity-strategy',
  instance: 'font-mono font-semibold text-entity-instance',
  opportunity: 'font-semibold text-option-category-opportunity',
  structure: 'font-semibold text-option-category-structure',
}

export function denseOptionCategoryLabelClass(
  variant: DenseOptionCategoryVariant,
  className?: string,
): string {
  return cn(optionCategoryLabelByVariant[variant], className)
}
