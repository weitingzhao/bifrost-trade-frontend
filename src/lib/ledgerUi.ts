import { bubbleButtonClass, bubbleGroupClass } from '@/components/positions/charts/bubbleSwitchStyles'

export function ledgerBubbleBtn(active: boolean): string {
  return bubbleButtonClass(active, 'sm')
}

export const ledgerFilterPanelClass =
  'rounded-lg border border-border bg-card/50 p-3 space-y-2 mb-3'
export const ledgerFilterRowClass = 'flex flex-wrap items-end gap-3 min-w-0'
export const ledgerFilterLabelClass =
  'text-[0.68rem] font-bold uppercase tracking-wide text-muted-foreground shrink-0'

export function ledgerBubbleGroupClass(): string {
  return bubbleGroupClass('sm')
}
