import { cn } from '@/lib/utils'

/** Dense UI tag variants — outline pills (border + text only, no fill). */
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

const shellBySize: Record<DenseTagSize, string> = {
  cell: 'inline-block rounded-full border text-[0.6875rem] font-medium px-[0.45rem] py-[0.1rem]',
  pill: 'inline-block rounded-full border text-xs font-semibold px-2 py-0.5',
}

const variantByType: Record<DenseTagVariant, Record<DenseTagSize, string>> = {
  category: {
    cell: 'border-entity-category/35 text-foreground',
    pill: 'border-entity-category/40 text-foreground',
  },
  symbol: {
    cell: 'border-entity-symbol/40 text-foreground font-semibold',
    pill: 'border-entity-symbol/45 text-foreground font-bold tracking-wide',
  },
  strategy: {
    cell: 'border-entity-strategy/45 text-entity-strategy font-semibold',
    pill: 'border-entity-strategy/45 text-entity-strategy font-semibold',
  },
  instance: {
    cell: 'border-entity-instance/45 text-entity-instance font-mono font-semibold',
    pill: 'border-entity-instance/45 text-entity-instance font-mono font-semibold',
  },
  success: {
    cell: 'border-emerald-500/45 text-emerald-600 dark:text-emerald-400',
    pill: 'border-emerald-500/45 text-emerald-600 dark:text-emerald-400',
  },
  warning: {
    cell: 'border-amber-500/45 text-amber-700 dark:text-amber-400',
    pill: 'border-amber-500/45 text-amber-700 dark:text-amber-400',
  },
  danger: {
    cell: 'border-red-500/45 text-red-600 dark:text-red-400',
    pill: 'border-red-500/45 text-red-600 dark:text-red-400',
  },
  neutral: {
    cell: 'border-border text-muted-foreground',
    pill: 'border-border text-muted-foreground',
  },
  info: {
    cell: 'border-sky-500/45 text-sky-700 dark:text-sky-400',
    pill: 'border-sky-500/45 text-sky-700 dark:text-sky-400',
  },
  'source-flex': {
    cell: 'border-emerald-500/45 text-emerald-700 dark:text-emerald-400 font-mono text-xs font-semibold',
    pill: 'border-emerald-500/45 text-emerald-700 dark:text-emerald-400 font-mono text-xs font-semibold',
  },
  'source-tws': {
    cell: 'border-sky-500/45 text-sky-700 dark:text-sky-400 font-mono text-xs font-semibold',
    pill: 'border-sky-500/45 text-sky-700 dark:text-sky-400 font-mono text-xs font-semibold',
  },
  'source-journal': {
    cell: 'border-amber-500/45 text-amber-700 dark:text-amber-400 font-mono text-xs font-semibold',
    pill: 'border-amber-500/45 text-amber-700 dark:text-amber-400 font-mono text-xs font-semibold',
  },
  'source-manual': {
    cell: 'border-violet-500/45 text-violet-700 dark:text-violet-400 font-mono text-xs font-semibold',
    pill: 'border-violet-500/45 text-violet-700 dark:text-violet-400 font-mono text-xs font-semibold',
  },
  'source-muted': {
    cell: 'border-border text-muted-foreground font-mono text-xs font-semibold',
    pill: 'border-border text-muted-foreground font-mono text-xs font-semibold',
  },
}

export function denseTagClass(
  variant: DenseTagVariant = 'category',
  size: DenseTagSize = 'cell',
  className?: string,
): string {
  return cn(shellBySize[size], variantByType[variant][size], className)
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
