import { cn } from '@/lib/utils'
import { denseTable, denseTableEntityCell } from '@/components/data-display'

/** Live page table shell + sticky header bridge to Dense UI tokens. */
export const liveTable = {
  shell: cn('mt-2 dense-scroll-x rounded-lg border border-border overflow-x-auto'),
  table: denseTable.table,
  stickyThead: '[&_th]:sticky [&_th]:top-0 [&_th]:z-[1] [&_th]:bg-secondary/40',
  symbolCell: cn(denseTableEntityCell, 'font-semibold text-entity-symbol'),
  colGroupHead: cn(
    'text-center font-semibold',
    'bg-[color-mix(in_oklch,var(--foreground)_3%,hsl(var(--secondary)/0.4))]',
    'border-b-2 border-border',
  ),
  stackedPnlHead: 'whitespace-normal leading-snug normal-case',
  stackedPnlHeadSub: 'block font-medium text-dense-meta opacity-85',
  stackedPnlLines: 'text-right leading-snug',
  stackedPnlLine: 'block text-right leading-tight',
  stackedPnlLineGap: 'mt-0.5',
  lastBidAsk: 'font-mono whitespace-nowrap',
  quoteSpread: 'text-dense-meta ml-1 opacity-90',
  bidAskSpread: 'text-[0.8em] ml-1 opacity-75',
} as const

/** Quote freshness dims the symbol tag only — drag handle stays muted separately. */
export function liveSymbolFreshnessTagClass(
  freshness: 'fresh' | 'stale' | 'very-stale' | null | undefined,
): string {
  return cn(
    freshness === 'stale' && 'opacity-85',
    freshness === 'very-stale' && 'opacity-60',
  )
}
