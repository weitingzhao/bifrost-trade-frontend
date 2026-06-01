import { cn } from '@/lib/utils'

export const ledgerFilterPanelClass =
  'rounded-lg border border-border bg-card/50 p-3 space-y-2'

export const ledgerFilterRowClass = 'flex flex-wrap items-center gap-2 min-w-0'

export const ledgerFilterLabelClass =
  'text-[11px] font-semibold uppercase tracking-wide text-muted-foreground shrink-0'

export function ledgerBubbleBtn(active: boolean): string {
  return cn(
    'inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-[11px] font-semibold transition-colors',
    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
    active
      ? 'border-primary/50 bg-primary/15 text-foreground'
      : 'border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground',
  )
}
