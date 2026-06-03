import { cn } from '@/lib/utils'
import { denseTable } from '@/components/data-display/denseTableClasses'

/** Live page table shell + sticky header bridge to Dense UI tokens. */
export const liveTable = {
  shell: cn('mt-2 dense-scroll-x rounded-lg border border-border overflow-x-auto'),
  table: denseTable.table,
  stickyThead: '[&_th]:sticky [&_th]:top-0 [&_th]:z-[1] [&_th]:bg-secondary/40',
  colGroupHead: cn(
    'text-center font-semibold',
    'bg-[color-mix(in_oklch,var(--foreground)_3%,hsl(var(--secondary)/0.4))]',
    'border-b-2 border-border',
  ),
  stackedPnlHead: 'whitespace-normal leading-snug normal-case',
  stackedPnlHeadSub: 'block font-medium text-[length:var(--text-dense-meta)] opacity-85',
  stackedPnlLines: 'text-right leading-snug',
  stackedPnlLine: 'block text-right leading-tight',
  stackedPnlLineGap: 'mt-0.5',
  symbolCell: 'font-bold text-entity-symbol',
  symbolFresh: 'text-foreground',
  symbolStale: 'text-muted-foreground opacity-85',
  symbolVeryStale: 'text-muted-foreground/60 opacity-60',
  lastBidAsk: 'font-mono whitespace-nowrap',
  quoteSpread: 'text-[length:var(--text-dense-meta)] ml-1 opacity-90',
  bidAskSpread: 'text-[0.8em] ml-1 opacity-75',
} as const

export function liveSymbolFreshnessClass(
  freshness: 'fresh' | 'stale' | 'very-stale' | null | undefined,
): string {
  return cn(
    liveTable.symbolCell,
    freshness === 'fresh' && liveTable.symbolFresh,
    freshness === 'stale' && liveTable.symbolStale,
    freshness === 'very-stale' && liveTable.symbolVeryStale,
  )
}
