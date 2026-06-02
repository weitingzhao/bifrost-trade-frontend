import { cn } from '@/lib/utils'
import { denseTable } from '@/components/data-display/denseTableClasses'
import { ledgerFilterLabelClass } from '@/lib/ledgerUi'

/** Transfer & Pay page inner surface (elevated card on PageShell canvas). */
export const transferPayPageCardClass = cn(
  'flex flex-col gap-3 rounded-lg border border-border bg-card p-4',
)

export const transferPayUi = {
  headerRow: 'flex flex-wrap items-start justify-between gap-3',
  headerActions: 'flex flex-wrap items-center gap-3',
  rangeField: 'inline-flex items-center gap-2 border-0 m-0 p-0',
  rangeLegend: ledgerFilterLabelClass,
  feedbackOk: 'm-0 text-sm text-success',
  feedbackErr: 'm-0 text-sm text-destructive',
  section: 'mt-1',
  sectionHint: denseTable.emptyHint,
  toolbar: 'mb-2 flex flex-wrap items-center gap-3',
  typesFilter: 'inline-flex flex-wrap items-center gap-2 border-0 m-0 p-0',
  typesLegend: ledgerFilterLabelClass,
  toolbarRight: cn(
    'ml-auto flex flex-wrap items-center gap-3',
    'text-[0.8125rem] text-muted-foreground',
  ),
  summaryHead: 'mt-3 mb-1.5 flex flex-wrap items-center justify-between gap-2',
  summaryTitle: 'inline-flex items-center gap-1 m-0 text-sm font-semibold',
  summaryView: 'inline-flex items-center gap-1.5',
  viewLabel: 'text-xs text-muted-foreground',
  changeHint: 'block text-[length:var(--text-dense-meta)] leading-snug text-muted-foreground',
  paginationBar: 'inline-flex items-center gap-1.5',
  pageBtn: cn(
    'h-7 rounded-md border border-border bg-secondary px-2.5',
    'text-xs font-medium text-foreground',
    'hover:bg-muted disabled:cursor-not-allowed disabled:opacity-45',
  ),
  pageInfo: 'whitespace-nowrap text-xs',
} as const
