import { cn } from '@/lib/utils'
import { denseTable } from '@/components/data-display/denseTableClasses'

/** Model Analysis table shell + sticky header bridge to Dense UI tokens. */
export const modelAnalysisTable = {
  shell: cn('dense-scroll-x rounded-lg border border-border overflow-x-auto'),
  table: denseTable.table,
  stickyThead: '[&_th]:sticky [&_th]:top-0 [&_th]:z-[1] [&_th]:bg-secondary/40',
  symbolCell: 'font-semibold',
  detailCell: cn(
    'bg-secondary/15 align-top whitespace-normal',
    'py-3 px-[var(--table-cell-px)]',
  ),
  clickableRow: 'cursor-pointer hover:bg-primary/5',
  expandedRow: 'bg-primary/[0.04]',
} as const

export const modelAnalysisPageStackClass = 'flex flex-col gap-3 min-w-0'

export const modelAnalysisHypotheticalBadgeClass =
  'inline-flex items-center gap-1 rounded-md border border-warning/40 bg-warning-soft px-2 py-0.5 text-[0.6875rem] font-semibold tracking-wide text-warning whitespace-nowrap'

export const modelAnalysisDisclaimerClass =
  'rounded-md border border-warning/35 bg-warning-soft/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground'

export const modelAnalysisConfigHintClass =
  'rounded-md border border-dashed border-border bg-muted px-3 py-2 text-xs leading-relaxed text-muted-foreground max-w-2xl'

export const modelAnalysisSummaryStripClass =
  'flex flex-wrap gap-x-8 gap-y-2 border-b border-border py-3'

export const modelAnalysisSummaryItemClass = 'min-w-[6.5rem]'

export const modelAnalysisSummaryLabelClass =
  'block text-[0.625rem] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5'

export const modelAnalysisSummaryValueClass =
  'text-[0.9375rem] font-semibold font-mono tabular-nums text-foreground'

export const modelAnalysisEmptyHintClass =
  'py-8 text-center text-sm text-muted-foreground'

export const modelAnalysisProseClass = 'text-[length:var(--text-dense)] text-muted-foreground leading-relaxed'

export const modelAnalysisSubheadingClass = 'text-sm font-semibold text-foreground mb-1'

export const modelAnalysisMetaRowClass = 'flex flex-wrap gap-x-6 gap-y-2 text-[length:var(--text-dense)]'

export const modelAnalysisMetaMutedClass = 'text-muted-foreground'

export const modelAnalysisCarBlockClass =
  'mt-2 rounded-md border border-border bg-background p-3'

export const modelAnalysisCarTitleClass = 'text-[length:var(--text-dense)] font-semibold mb-1'

export const modelAnalysisCodeRefClass =
  'mt-1.5 text-[0.6875rem] font-mono text-muted-foreground'

export const modelAnalysisMethodCodeClass =
  'rounded-sm bg-muted px-1 py-0.5 text-[0.6875rem] font-mono'

export const modelAnalysisScenarioLineClass = 'text-[length:var(--text-dense)] text-foreground'

export const modelAnalysisMethodologyBlockClass =
  'my-2 rounded-md border border-dashed border-border bg-muted/40 p-3'

export const modelAnalysisMethodologyListClass =
  'mt-1.5 list-disc pl-4 text-xs text-muted-foreground leading-relaxed [&_li]:mb-1.5'

export const modelAnalysisStressNoteClass =
  'mb-2 text-xs text-muted-foreground leading-relaxed'

export const modelAnalysisDetailStackClass = 'flex flex-col gap-3 min-w-0'

export const MAIN_TABLE_COL_SPAN = 11
