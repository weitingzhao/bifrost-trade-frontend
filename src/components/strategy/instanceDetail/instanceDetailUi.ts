/** Tailwind layout tokens for embedded strategy instance detail panels. */
import { inspectorShell } from '@/components/layout/rightInspectorUi'

export const instanceDetailPageClass = inspectorShell.stack
export const instanceMainGridClass = 'flex flex-col gap-4 min-w-0'
export const instanceDetailBlockClass = inspectorShell.section
export const instanceSectionTitleClass = inspectorShell.sectionTitle
export const instanceRiskSectionBodyClass = 'min-w-0'

export const instanceOverviewHeadClass = 'flex flex-wrap items-center justify-between gap-2'
export const instanceInfoDlClass = 'grid gap-1 text-xs'
export const instanceMutedClass = 'text-muted-foreground'
export const instanceErrorClass = 'text-destructive text-xs'

export const instanceStatusOpenClass =
  'inline-flex rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-600 dark:text-emerald-400'
export const instanceStatusClosedClass =
  'inline-flex rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground'
export const instanceStatusUnknownClass =
  'inline-flex rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700 dark:text-amber-400'

export const instancePnlColumnClass = 'min-w-0'
export const instancePnlSectionHeadClass = 'flex items-center gap-2 mb-2'
export const instancePnlInfoBtnClass =
  'inline-flex h-5 w-5 items-center justify-center rounded border border-border text-muted-foreground text-[10px] hover:bg-secondary'
export const instancePnlPanelClass = inspectorShell.card
export const instancePnlPanelMutedClass = 'rounded-lg border border-dashed border-border p-3 text-center'
export const instancePnlBandsClass = 'grid gap-2 sm:grid-cols-2'
export const instancePnlBandClass = inspectorShell.card
export const instancePnlBandHeadClass = 'flex items-start justify-between gap-2 mb-1'
export const instancePnlBandTitleClass = inspectorShell.cardLabel
export const instancePnlBandHelpBtnClass =
  'text-muted-foreground hover:text-foreground text-xs leading-none'
export const instancePnlBandMetricsClass = 'grid gap-1.5'
export const instancePnlMetricClass = 'flex justify-between gap-2 text-xs'
export const instancePnlMetricSecondaryClass = 'opacity-85'
export const instancePnlLabelClass = 'text-muted-foreground shrink-0'
export const instancePnlValueClass = 'font-mono tabular-nums text-right'
export const instanceCommissionClass = 'text-muted-foreground'

export const instanceExecTabsClass = 'inline-flex rounded-full border border-border bg-secondary/60 p-0.5 gap-0.5'
export const instanceExecTabClass =
  'rounded-full px-2.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors'
export const instanceExecTabActiveClass = 'bg-card text-foreground shadow-sm'
export const instanceExecHintClass = 'text-[11px] text-muted-foreground'

export const instanceKlinePanelClass =
  'rounded-lg border border-dashed border-border bg-secondary/20 p-6 text-center'
export const instanceKlineHintClass = 'text-xs text-muted-foreground'

/** Executions match tables (Phase 4.9 — no module CSS) */
export const instanceExecMatchWrapClass =
  'mb-3 overflow-x-auto rounded-lg border border-border bg-card/90'
export const instanceExecMatchTableClass = 'w-full border-collapse text-[0.8125rem]'
export const instanceExecMatchThClass =
  'border-b border-border bg-muted/25 px-2 py-1.5 text-left align-top text-[0.72rem] font-semibold tracking-wide'
export const instanceExecMatchThBuyClass = 'text-profit'
export const instanceExecMatchThSellClass = 'text-right text-loss'
export const instanceExecMatchTdClass =
  'border-b border-border/65 px-2 py-1.5 align-top'
export const instanceExecMatchTdNumsClass = 'font-mono tabular-nums'
export const instanceExecMatchTdSellClass = 'text-right'
export const instanceExecContractCenterClass = 'text-center'
export const instanceExecContractLinkClass =
  'font-mono text-[0.8125rem] font-semibold text-[var(--color-entity-option)]'
export const instanceExecNetBadgeClass =
  'mt-0.5 inline-flex flex-wrap items-center justify-center gap-1.5 text-xs'
export const instanceExecNetOpenClass =
  'rounded px-1.5 py-0.5 text-[0.68rem] font-semibold bg-amber-500/20 text-foreground'
export const instanceExecNetFlatClass =
  'rounded px-1.5 py-0.5 text-[0.68rem] font-semibold bg-[var(--color-success-soft)] text-profit'
export const instanceExecFillsWrapClass = 'grid grid-cols-2 border-t border-border'
export const instanceExecFillsHeaderClass =
  'px-2.5 py-1 text-[0.72rem] font-semibold uppercase tracking-wide'
export const instanceExecFillsBuyHeaderClass =
  'border-b border-[var(--color-success)]/35 bg-[var(--color-success-soft)] text-profit'
export const instanceExecFillsSellHeaderClass =
  'border-b border-border border-l bg-secondary/50 text-loss'
export const instanceExecFillsRowClass =
  'grid grid-cols-4 gap-1 border-t border-border/50 px-2.5 py-1 font-mono text-xs tabular-nums'
export const instanceExecFillsColSellClass = 'border-l border-border'
export const instanceExecTotalsRowClass =
  'flex flex-wrap justify-end gap-x-5 gap-y-2 rounded-lg border border-border bg-muted/20 px-2.5 py-2 text-[0.8125rem]'
