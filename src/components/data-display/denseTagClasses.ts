import { cn } from '@/lib/utils'

/** Dense UI tag variants — bordered tinted pills (Trade Ledger category is the reference shape). */
export type DenseTagVariant =
  | 'category'
  | 'symbol'
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
  cell: 'inline-block rounded px-1.5 py-0.5',
  pill: 'inline-block rounded-md px-2 py-0.5',
}

const weightBySize: Record<DenseTagSize, string> = {
  cell: 'font-medium',
  pill: 'font-semibold',
}

const variantByType: Record<DenseTagVariant, Record<DenseTagSize, string>> = {
  category: {
    cell: 'border border-purple-500/25 bg-purple-500/10 text-foreground',
    pill: 'border border-purple-500/30 bg-purple-500/15 text-foreground',
  },
  symbol: {
    cell: 'border border-primary/30 bg-primary/15 text-foreground font-semibold',
    pill: 'border border-primary/35 bg-primary/15 text-foreground font-bold tracking-wide',
  },
  success: {
    cell: 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
    pill: 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  },
  warning: {
    cell: 'border border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-400',
    pill: 'border border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-400',
  },
  danger: {
    cell: 'border border-red-500/40 bg-red-500/15 text-red-600 dark:text-red-400',
    pill: 'border border-red-500/40 bg-red-500/15 text-red-600 dark:text-red-400',
  },
  neutral: {
    cell: 'border border-border bg-muted/50 text-muted-foreground',
    pill: 'border border-border bg-muted/50 text-muted-foreground',
  },
  info: {
    cell: 'border border-sky-500/40 bg-sky-500/15 text-sky-700 dark:text-sky-400',
    pill: 'border border-sky-500/40 bg-sky-500/15 text-sky-700 dark:text-sky-400',
  },
  'source-flex': {
    cell: 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-mono text-xs font-semibold',
    pill: 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-mono text-xs font-semibold',
  },
  'source-tws': {
    cell: 'border border-sky-500/40 bg-sky-500/15 text-sky-700 dark:text-sky-400 font-mono text-xs font-semibold',
    pill: 'border border-sky-500/40 bg-sky-500/15 text-sky-700 dark:text-sky-400 font-mono text-xs font-semibold',
  },
  'source-journal': {
    cell: 'border border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-400 font-mono text-xs font-semibold',
    pill: 'border border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-400 font-mono text-xs font-semibold',
  },
  'source-manual': {
    cell: 'border border-violet-500/40 bg-violet-500/15 text-violet-700 dark:text-violet-400 font-mono text-xs font-semibold',
    pill: 'border border-violet-500/40 bg-violet-500/15 text-violet-700 dark:text-violet-400 font-mono text-xs font-semibold',
  },
  'source-muted': {
    cell: 'border border-border bg-muted/50 text-muted-foreground font-mono text-xs font-semibold',
    pill: 'border border-border bg-muted/50 text-muted-foreground font-mono text-xs font-semibold',
  },
}

export function denseTagClass(
  variant: DenseTagVariant = 'category',
  size: DenseTagSize = 'cell',
  className?: string,
): string {
  return cn(shellBySize[size], weightBySize[size], variantByType[variant][size], className)
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
