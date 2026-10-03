/** Tailwind layout tokens for embedded strategy instance detail panels. */
import { inspectorShell } from '@/components/layout/rightInspectorUi'

export const tradeDetailPageClass = inspectorShell.stack
export const tradeMainGridClass = 'flex flex-col gap-3 min-w-0'
export const tradeDetailBlockClass = inspectorShell.section
export const tradeSectionTitleClass = inspectorShell.sectionTitle
export const tradeRiskSectionBodyClass = 'min-w-0'

export const tradeOverviewHeadClass = 'flex flex-wrap items-center justify-between gap-2'
export const tradeInfoDlClass = 'grid gap-1 text-xs'
export const tradeMutedClass = 'text-muted-foreground'
export const tradeErrorClass = 'text-destructive text-xs'

export const tradeStatusOpenClass =
  'inline-flex border border-success/40 bg-success-soft px-2 py-0.5 text-dense-caption font-semibold uppercase text-success mat-tag'
export const tradeStatusClosedClass =
  'inline-flex border px-2 py-0.5 text-dense-caption font-semibold uppercase text-muted-foreground mat-tag'
export const tradeStatusUnknownClass =
  'inline-flex border border-warning/40 bg-warning-soft px-2 py-0.5 text-dense-caption font-semibold uppercase text-warning mat-tag'

export const tradePnlColumnClass = 'min-w-0'
export const tradePnlSectionHeadClass = 'flex items-center gap-2 mb-2'
export const tradePnlInfoBtnClass =
  'inline-flex h-5 w-5 items-center justify-center rounded-full border border-border text-muted-foreground text-dense-caption hover:bg-secondary'
export const tradePnlPanelClass = inspectorShell.card
export const tradePnlPanelMutedClass = 'rounded-lg border border-dashed border-border p-3 text-center'
export const tradePnlBandsClass = 'grid gap-2 sm:grid-cols-2'
export const tradePnlBandClass = inspectorShell.card
export const tradePnlBandHeadClass = 'flex items-start justify-between gap-2 mb-1'
export const tradePnlBandTitleClass = inspectorShell.cardLabel
export const tradePnlBandHelpBtnClass =
  'text-muted-foreground hover:text-foreground text-xs leading-none'
export const tradePnlBandMetricsClass = 'grid gap-1.5'
export const tradePnlMetricClass = 'flex justify-between gap-2 text-xs'
export const tradePnlMetricSecondaryClass = 'opacity-85'
export const tradePnlLabelClass = 'text-muted-foreground shrink-0'
export const tradePnlValueClass = 'font-mono tabular-nums text-right'
export const tradeCommissionClass = 'text-muted-foreground'

// Rev .142: the capsule segmented control — an ink-7% track, the chosen segment at 15% with the lens.
export const tradeExecTabsClass =
  'inline-flex h-[30px] items-center gap-0.5 self-start rounded-full bg-[color-mix(in_srgb,var(--foreground)_7%,transparent)] p-[3px]'
export const tradeExecTabClass =
  'inline-flex h-6 items-center gap-1.5 rounded-full bg-transparent px-3 text-xs font-semibold text-[var(--sk-mute2)] transition-colors hover:text-[var(--foreground)] active:[filter:var(--press)]'
export const tradeExecTabActiveClass =
  'bg-[color-mix(in_srgb,var(--foreground)_15%,transparent)] text-[var(--foreground)] shadow-[var(--glass-lens),0_1px_2px_rgba(0,0,0,0.22)] hover:text-[var(--foreground)]'
export const tradeExecHintClass = 'text-dense-meta text-muted-foreground'

export const tradeKlinePanelClass =
  'rounded-lg border border-dashed border-border bg-secondary/20 p-6 text-center'
export const tradeKlineHintClass = 'text-xs text-muted-foreground'

/** Executions match tables (Phase 4.9 — no module CSS) */
export const tradeExecMatchWrapClass =
  'mb-3 overflow-x-auto border mat-card'
export const tradeExecMatchTableClass = 'w-full border-collapse text-dense-body'
export const tradeExecMatchThClass =
  'border-b border-border bg-muted/25 px-2 py-1.5 text-left align-top text-dense-label font-semibold tracking-wide'
export const tradeExecMatchThBuyClass = 'text-profit'
export const tradeExecMatchThSellClass = 'text-right text-loss'
export const tradeExecMatchTdClass =
  'border-b border-border/65 px-2 py-1.5 align-top'
export const tradeExecMatchTdNumsClass = 'font-mono tabular-nums'
export const tradeExecMatchTdSellClass = 'text-right'
export const tradeExecContractCenterClass = 'text-center'
export const tradeExecContractLinkClass =
  'font-mono text-dense-body font-semibold text-[var(--color-entity-option)]'
export const tradeExecNetBadgeClass =
  'mt-0.5 inline-flex flex-wrap items-center justify-center gap-1.5 text-xs'
export const tradeExecNetOpenClass =
  'rounded px-1.5 py-0.5 text-dense-meta font-semibold bg-amber-500/20 text-foreground'
export const tradeExecNetFlatClass =
  'rounded px-1.5 py-0.5 text-dense-meta font-semibold bg-[var(--color-success-soft)] text-profit'
export const tradeExecFillsWrapClass = 'grid grid-cols-2 border-t border-border'
export const tradeExecFillsHeaderClass =
  'px-2.5 py-1 text-dense-label font-semibold uppercase tracking-wide'
export const tradeExecFillsBuyHeaderClass =
  'border-b border-[var(--color-success)]/35 bg-[var(--color-success-soft)] text-profit'
export const tradeExecFillsSellHeaderClass =
  'border-b border-border border-l bg-secondary/50 text-loss'
export const tradeExecFillsRowClass =
  'grid grid-cols-4 gap-1 border-t border-border/50 px-2.5 py-1 font-mono text-xs tabular-nums'
export const tradeExecFillsColSellClass = 'border-l border-border'
export const tradeExecTotalsRowClass =
  'flex flex-wrap justify-end gap-x-5 gap-y-2 border px-2.5 py-2 text-dense-body mat-card'
