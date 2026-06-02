/** Tailwind class bundles for Instance tab detail panels (replaces InstanceStrategyPanel.module.css). */
import { cn } from '@/lib/utils'

export const instancePanel = {
  filters:
    'mb-3 flex min-w-0 flex-nowrap items-center gap-x-3 gap-y-2 dense-scroll-x',
  filterBubbleRow: 'inline-flex shrink-0 flex-nowrap items-center gap-x-2 gap-y-1',
  filterBubbleLabel:
    'shrink-0 whitespace-nowrap text-[0.72rem] font-semibold uppercase tracking-wide text-muted-foreground',
  tableWrap: cn('w-full min-w-0', 'dense-scroll-x'),
  sheetTable: 'w-full min-w-[68rem] table-fixed',
  sheetRow:
    'cursor-pointer hover:bg-muted/35 [&_td]:whitespace-nowrap [&_td]:text-[0.8rem] [&_td:nth-child(2)]:whitespace-normal [&_td:nth-child(2)]:align-top [&_td:nth-child(3)]:whitespace-normal [&_td:nth-child(4)]:whitespace-normal [&_td:nth-child(4)]:align-top',
  sheetRowExpanded: 'bg-muted/25',
  oppCell: 'max-w-0 overflow-hidden align-top',
  execQtyCell: 'max-w-36 overflow-hidden text-ellipsis tabular-nums',
  contractTypeCell: 'align-top whitespace-normal',
  oppPrimary: 'block font-semibold leading-snug text-foreground line-clamp-2 break-words',
  oppSecondary:
    'm-0 cursor-pointer border-none bg-transparent p-0 text-left font-mono text-[0.72rem] font-semibold leading-tight text-link no-underline transition-colors hover:text-link-hover hover:underline focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link',
  detailRow: 'border-b border-border/45 bg-transparent hover:bg-transparent',
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
  subTable: 'text-[0.82rem] tabular-nums',
  subTableHeader: 'bg-secondary [&_tr]:border-b-2 [&_tr]:border-border-strong',
  subTableHead:
    'h-auto bg-transparent px-2 py-1.5 text-[0.72rem] font-semibold uppercase tracking-wide text-[#7a8492]',
  subTableCell: 'px-2 py-1.5 text-[0.82rem] font-medium text-[#e4e9ef]',
  subDataRow: 'border-b border-border/40 bg-card transition-colors hover:bg-accent-soft',
  subExecRow:
    'border-b border-border/35 bg-secondary text-[0.88em] hover:bg-[color-mix(in_srgb,hsl(var(--secondary))_92%,hsl(var(--foreground))_8%)]',
  subContractBtn:
    'cursor-pointer border-none bg-transparent p-0 text-left font-mono text-[0.82rem] font-semibold text-sky-400 hover:text-sky-300 hover:underline [&_strong]:font-bold',
  subMutedCell: 'font-normal text-[#7a8492]',
  subTimeAgo: 'font-medium text-warning',
  subExpiryDte: 'text-[0.72rem] font-semibold text-warning',
} as const
