import { cn } from '@/lib/utils'
import { denseTable } from '@/components/data-display'
import { positionsUi } from '@/components/positions/positionsUi'

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

/** The model band on Backing & Model: the page's panel, its header bar, and its body stack. */
export const modelBandSectionClass = positionsUi.panel

export const modelBandHeaderClass = positionsUi.panelHead

export const modelBandTitleClass = cn(positionsUi.cap, 'flex items-center gap-1.5')

export const modelBandScopeLineClass = cn(positionsUi.mono, 'text-dense-meta leading-normal text-muted-foreground')

export const modelBandBodyClass = 'flex min-w-0 flex-col gap-2.5 px-3 pt-2.5 pb-3'

export const modelAnalysisHypotheticalBadgeClass =
  'inline-flex items-center gap-1 rounded-md border border-warning/40 bg-warning-soft px-2 py-0.5 text-dense-meta font-semibold tracking-wide text-warning whitespace-nowrap'

export const modelAnalysisDisclaimerClass =
  'rounded-md border border-warning/35 bg-warning-soft/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground'

export const modelAnalysisConfigHintClass =
  'rounded-md border border-dashed border-border bg-muted px-3 py-2 text-xs leading-relaxed text-muted-foreground max-w-2xl'

export const modelAnalysisSummaryStripClass = 'flex flex-wrap gap-x-6.5 gap-y-2.5 border-b border-border pb-2.5'

export const modelAnalysisSummaryItemClass = 'flex min-w-26 flex-col gap-0.5'

export const modelAnalysisSummaryLabelClass = positionsUi.cap

export const modelAnalysisSummaryValueClass = 'font-mono text-dense-label leading-normal font-bold tabular-nums text-foreground'

export const modelAnalysisEmptyHintClass =
  'py-8 text-center text-sm text-muted-foreground'

export const modelAnalysisProseClass = 'text-dense-body text-muted-foreground leading-relaxed'

export const modelAnalysisSubheadingClass = 'text-sm font-semibold text-foreground mb-1'

export const modelAnalysisMetaRowClass = 'flex flex-wrap gap-x-6 gap-y-2 text-dense-body'

export const modelAnalysisMetaMutedClass = 'text-muted-foreground'

export const modelAnalysisCarBlockClass =
  'mt-2 rounded-md border border-border bg-background p-3'

export const modelAnalysisCarTitleClass = 'text-dense-body font-semibold mb-1'

export const modelAnalysisCodeRefClass =
  'mt-1.5 text-dense-meta font-mono text-muted-foreground'

export const modelAnalysisMethodCodeClass =
  'rounded-sm bg-muted px-1 py-0.5 text-dense-meta font-mono'

export const modelAnalysisScenarioLineClass = 'text-dense-body text-foreground'

export const modelAnalysisMethodologyBlockClass =
  'my-2 rounded-md border border-dashed border-border bg-muted/40 p-3'

export const modelAnalysisMethodologyListClass =
  'mt-1.5 list-disc pl-4 text-xs text-muted-foreground leading-relaxed [&_li]:mb-1.5'

export const modelAnalysisStressNoteClass =
  'mb-2 text-xs text-muted-foreground leading-relaxed'

export const modelAnalysisDetailStackClass = 'flex flex-col gap-3 min-w-0'

export const MAIN_TABLE_COL_SPAN = 11
