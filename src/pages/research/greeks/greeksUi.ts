import { cn } from '@/lib/utils'
import { denseTable } from '@/components/data-display/denseTableClasses'

export const greeksControlsInnerClass = cn(
  'flex flex-wrap items-end gap-4',
)

export const greeksFieldLabelClass = cn(
  'text-[length:var(--text-dense-meta)] font-semibold uppercase tracking-wide text-muted-foreground',
)

export const greeksInfoBarClass = cn(
  'flex flex-wrap items-center gap-x-5 gap-y-2 px-1 py-1 text-xs',
)

export const greeksInfoLabelClass = 'text-muted-foreground mr-1.5'

export const greeksInfoApproxClass = cn(
  'ml-auto text-[length:var(--text-dense-meta)] italic text-muted-foreground',
)

export const greeksEmptyHintClass = denseTable.emptyHint

export const greeksLoadingHintClass = cn(denseTable.emptyHint, 'py-6')

export function greeksIvCellClass(iv: number | null): string {
  if (iv == null) return ''
  if (iv < 0.3) return 'text-green-600 dark:text-green-400'
  if (iv < 0.8) return ''
  return 'text-amber-600 dark:text-amber-400'
}

export function greeksDeltaCellClass(delta: number | null): string {
  if (delta == null) return ''
  const abs = Math.abs(delta)
  if (abs >= 0.4 && abs <= 0.6) return 'text-primary font-medium'
  return ''
}

export const greeksCalcTooltipClass = cn(
  'fixed z-50 max-w-md rounded-lg border border-border bg-popover p-3 shadow-lg',
  'text-[length:var(--text-dense-meta)] font-mono pointer-events-none',
)

export const greeksTooltipBodyClass = 'space-y-3'

export const greeksTooltipSectionClass = 'min-w-0'

export const greeksTooltipHeadingClass = cn(
  'mb-1 font-sans text-xs font-semibold text-foreground',
)

export const greeksTooltipKvGridClass = cn(
  'grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 tabular-nums',
)

export const greeksTooltipKvKeyClass = 'text-muted-foreground'

export const greeksTooltipMonoClass = 'leading-relaxed'

export const greeksTooltipWarnClass = 'text-amber-600 dark:text-amber-400'

export const greeksTooltipCompareGridClass = cn(
  'grid grid-cols-[auto_1fr_1fr] gap-x-3 gap-y-0.5 tabular-nums',
)

export const greeksTooltipCompareColClass = 'text-right text-muted-foreground'

export const greeksTooltipFooterClass = cn(
  'border-t border-border/60 pt-2 text-muted-foreground',
)
