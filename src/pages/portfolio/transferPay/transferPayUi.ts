import { cn } from '@/lib/utils'
import { denseTable } from '@/components/data-display'
import { ledgerFilterLabelClass } from '@/lib/ledgerUi'

/** Transfer & Pay page inner surface (elevated card on PageShell canvas). */
export const transferPayPageCardClass = cn(
  'flex flex-col gap-3 border p-4 mat-card',
)

export const transferPayUi = {
  headerRow: 'flex flex-wrap items-start justify-between gap-3',
  headerActions: 'flex flex-wrap items-center gap-3',
  /** No flex-child classes: this sits in a column, where `basis` would be a height. */
  headerLead: 'm-0 max-w-[62rem] text-dense-body text-muted-foreground',
  rangeField: 'inline-flex items-center gap-2 border-0 m-0 p-0',
  rangeLegend: ledgerFilterLabelClass,
  feedbackRow: cn(
    'flex flex-wrap items-center gap-2 border px-2.5 py-1.5 mat-card',
    'text-dense-body',
  ),
  // A status row with a dot: lamp green, not the P&L green (§14.7).
  feedbackOkTone: 'border-lamp-green/35 bg-lamp-green/[0.06] text-lamp-green',
  feedbackErrTone: 'border-destructive/40 bg-destructive/[0.06] text-destructive',
  feedbackDot: 'h-2 w-2 shrink-0 rounded-full bg-current',
  feedbackWhen: 'ml-auto font-mono text-dense-meta text-muted-foreground',
  section: 'mt-1',
  sectionHint: denseTable.emptyHint,

  /** Section band: a label, a rule to the horizon, and one line of intent. */
  tierRow: 'mt-2 flex items-center gap-2.5',
  tierLabel: 'text-dense-caption font-bold uppercase tracking-[0.16em] text-foreground/85',
  tierRule: 'h-px flex-1 bg-border',
  tierNote: 'text-dense-meta text-muted-foreground',

  panel: 'border mat-card',
  chipRow: 'flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2',
  chipRowLabel: ledgerFilterLabelClass,
  chipGroup: 'flex flex-wrap gap-1',
  chip: cn(
    'inline-flex h-6 items-center gap-1.5 border px-2 mat-tag',
    'text-xs font-semibold transition-colors',
  ),
  chipOn: 'border-primary/55 bg-primary/[0.12] text-primary',
  chipOff: 'border-border bg-secondary/60 text-muted-foreground hover:text-foreground',
  chipCount: 'font-mono text-dense-meta font-normal opacity-80',
  iconToggle: cn(
    'inline-flex h-5 w-5 items-center justify-center rounded-full border border-border',
    'text-muted-foreground hover:border-primary/60 hover:text-primary',
  ),
  kindPanel: 'flex flex-col gap-1.5 px-0 pb-2',
  kindProse: 'm-0 px-3 text-dense-meta text-muted-foreground',
  kindRule: 'm-0 px-3 font-mono text-dense-meta text-muted-foreground/80',
  panelFoot: cn(
    'flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border',
    'bg-secondary/40 px-3 py-1.5 text-dense-body text-muted-foreground',
  ),
  netBlock: 'ml-auto inline-flex items-baseline gap-1.5',
  netValue: 'font-mono text-sm font-bold',
  netDash: 'font-mono text-sm font-bold text-muted-foreground',
  netNote: 'font-mono text-dense-meta text-muted-foreground',

  tableFoot: cn(
    'flex flex-wrap gap-x-4 gap-y-1.5 border-t border-border px-3 py-1.5',
    'text-dense-meta text-muted-foreground',
  ),
  tableFootRight: 'ml-auto font-mono',
  monthLabel: 'font-mono text-xs font-bold text-foreground/85',
  monthMeta: 'font-mono text-dense-meta text-muted-foreground',
  monthNet: 'ml-auto font-mono text-dense-meta font-semibold',
  cancelNote: 'block text-dense-meta',
  /** Same violet the design gives a reversal — never a direction or a fault colour. */
  cancelNoteNamed: 'text-entity-category',
  cancelNoteBare: 'text-muted-foreground',
  cancelRowTint: 'bg-entity-category/[0.06]',

  summaryHead: 'mt-1 mb-1.5 flex flex-wrap items-center justify-between gap-2',
  summaryTitle: 'inline-flex items-center gap-1 m-0 text-sm font-semibold',
  summaryNote: 'font-mono text-dense-meta text-muted-foreground',
  summaryView: 'inline-flex items-center gap-1.5',
  viewLabel: 'text-xs text-muted-foreground',
  changeHint: 'block text-dense-meta leading-snug text-muted-foreground',

  downstreamPanel: 'border mat-card',
  downstreamHead: cn(
    'flex flex-wrap items-baseline gap-2 border-b border-border',
    'bg-secondary/40 px-3 py-1.5',
  ),
  downstreamCap: ledgerFilterLabelClass,
  downstreamTitle: 'text-sm font-semibold text-foreground',
  downstreamBody: 'flex flex-col gap-2 px-3 py-2.5',
  downstreamLine: 'm-0 flex items-start gap-2 text-dense-body text-muted-foreground',
  downstreamLamp: 'mt-1.5 h-2 w-2 shrink-0 rounded-full',
  downstreamLampRuled: 'bg-lamp-yellow',
  downstreamLampUnwired: 'bg-lamp-gray',
  downstreamStrong: 'font-semibold text-foreground',
  downstreamFoot: 'flex flex-wrap items-center gap-2 px-3 pb-2.5 text-dense-meta',

  whatPanel: 'border mat-card',
  whatHead: 'flex flex-wrap items-baseline gap-2 px-3 pt-2 pb-1',
  whatCap: ledgerFilterLabelClass,
  whatClose: cn(
    'ml-auto inline-flex h-5 items-center border px-1.5 mat-btn',
    'text-dense-meta text-muted-foreground hover:text-foreground',
  ),
  whatBody: 'flex flex-col gap-1.5 px-3 pb-2.5',
  whatProse: 'm-0 text-dense-meta text-muted-foreground',
  whatAside: 'm-0 text-dense-meta text-muted-foreground/80',

  paginationBar: 'inline-flex items-center gap-1.5',
  pageBtn: cn(
    'h-7 border px-2.5 mat-btn',
    'text-xs font-medium text-foreground',
    'disabled:cursor-not-allowed disabled:opacity-45',
  ),
  pageInfo: 'whitespace-nowrap text-xs',
} as const
