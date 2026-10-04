/**
 * Tailwind class bundles for Instance tab detail panels (replaces InstanceStrategyPanel.module.css).
 * Rows follow the list grammar (Rev .153–.154, site-wide since batch 3): no row
 * rules, no own hover, a row state as `--sr-row` (the scope paints it as the
 * row's capsule; a `<tr>` background never shows inside a scope).
 */
import { cn } from '@/lib/utils'

export const tradePanel = {
  // Wraps rather than scrolls: a toolbar with a scrollbar hides its own controls.
  filters: 'mb-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5',
  filterBubbleRow: 'inline-flex shrink-0 flex-nowrap items-center gap-x-2 gap-y-1',
  filterBubbleLabel:
    'shrink-0 whitespace-nowrap text-dense-label font-semibold text-muted-foreground',
  tableWrap: cn('w-full min-w-0', 'dense-scroll-x'),
  sheetRow:
    'cursor-pointer [&_td]:whitespace-nowrap [&_td]:text-dense-body [&_td:nth-child(2)]:whitespace-normal [&_td:nth-child(2)]:align-top [&_td:nth-child(3)]:whitespace-normal [&_td:nth-child(4)]:whitespace-normal [&_td:nth-child(4)]:align-top',
  sheetRowExpanded: '[--sr-row:color-mix(in_srgb,var(--sk-ink)_8%,transparent)]',
  oppCell: 'max-w-0 overflow-hidden align-top',
  execQtyCell: 'max-w-36 overflow-hidden text-ellipsis tabular-nums',
  contractTypeCell: 'align-top whitespace-normal',
  oppPrimary:
    'block font-semibold leading-snug text-foreground whitespace-normal break-words [overflow-wrap:anywhere]',
  oppSecondary:
    'm-0 cursor-pointer border-none bg-transparent p-0 text-left font-mono text-dense-label font-semibold leading-tight text-link no-underline transition-colors hover:text-link-hover hover:underline focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link',
  detailRow: 'bg-transparent',
  detailCell:
    'max-w-0 overflow-x-auto overflow-y-visible border-t-0 bg-card p-2 pb-3 align-top whitespace-normal [-webkit-overflow-scrolling:touch]',
  detailStack: 'flex min-w-0 flex-col gap-1.5',
  subSection:
    'm-0 rounded-md border border-transparent px-2 py-2 transition-colors last:mb-0 hover:border-border/55 hover:bg-muted/30',
  subSectionCoverage:
    'border-border/65 bg-gradient-to-b from-secondary/55 to-muted/35 hover:border-border/80 hover:from-secondary/70 hover:to-muted/50',
  subSectionRisk: 'overflow-visible hover:bg-muted/20',
  subHeading: 'mb-1.5 border-none p-0 text-sm font-semibold leading-snug text-[#7a8492]',
  subSectionBody: 'min-w-0 border-none bg-transparent p-0',
  subTableWrap: 'm-0 w-full min-w-0 overflow-x-visible rounded-none border-none bg-transparent',
  subExecRow: 'text-[0.88em]',
  subMutedCell: 'font-normal text-[#7a8492]',
  subTimeAgo: 'font-medium text-warning',
  subExpiryDte: 'text-dense-label font-semibold text-warning',
} as const
