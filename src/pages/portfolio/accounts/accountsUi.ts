import { cn } from '@/lib/utils'
import { denseTable } from '@/components/data-display'
import { lampDotClass, lampTextClass, type LampTone } from '@/lib/lampTone'
import type { ClockTone } from '@/utils/accountsClocks'
import type { FreshnessState } from '@/utils/accountsFreshnessRows'
import type { StockBucket } from '@/utils/positionsGrouping'

/** Inner surface — same card the Transfer page sits on. */
export const accountsPageCardClass = cn(
  'flex flex-col gap-3 border p-4 mat-card',
)

const CLOCK_LAMP: Record<ClockTone, LampTone> = {
  ok: 'green',
  warn: 'yellow',
  fault: 'red',
  muted: 'gray',
}

const FRESHNESS_LAMP: Record<FreshnessState, LampTone> = {
  current: 'green',
  behind: 'yellow',
  dry: 'yellow',
  noReading: 'gray',
}

export function clockLamp(tone: ClockTone): LampTone {
  return CLOCK_LAMP[tone]
}

export function clockToneText(tone: ClockTone): string {
  return lampTextClass(clockLamp(tone))
}

export function clockToneDot(tone: ClockTone): string {
  return lampDotClass(clockLamp(tone))
}

export function freshnessLamp(state: FreshnessState): LampTone {
  return FRESHNESS_LAMP[state]
}

export function freshnessToneText(state: FreshnessState): string {
  return lampTextClass(freshnessLamp(state))
}

export function freshnessToneDot(state: FreshnessState): string {
  return lampDotClass(freshnessLamp(state))
}

/** Rec / newest-record age — the same numbers the freshness rows already speak. */
export function formatAgeDays(days: number | null | undefined): string {
  if (days == null || !Number.isFinite(days)) return '—'
  if (days < 1) return `${Math.round(days * 24)}h`
  return days < 100 ? `${days.toFixed(1)}d` : `${Math.round(days)}d`
}

export const BUCKET_LABEL: Record<StockBucket, string> = {
  core: 'Core',
  fixed_income: 'Fixed income',
  cash_like: 'Cash-like',
}

export const PRICE_AS_OF_STALE_TITLE =
  "no live quote; showing the snapshot's price timestamp"

export const accountsUi = {
  headerRow: 'flex flex-wrap items-start justify-between gap-3',
  headerActions: 'flex flex-wrap items-center gap-2',
  headerLead: 'm-0 max-w-[62rem] text-dense-body text-muted-foreground',

  clockChip: cn(
    'inline-flex items-center gap-1.5 border px-2 py-0.5 mat-tag',
    'text-dense-meta font-medium',
  ),
  clockSep: 'text-border',


  panel: 'border mat-card',
  // Rev .62: a panel head is a rule, not a band.
  panelHead: 'flex flex-wrap items-center gap-2 border-b border-border px-3 py-1.5',
  panelFoot: cn(
    'flex flex-wrap items-start gap-x-3 gap-y-1.5 border-t border-border',
    'px-3 py-1.5 text-dense-meta text-muted-foreground',
  ),
  widenWarn: cn(
    'border-b border-border bg-warning/[0.08] px-3 py-1.5',
    'text-dense-meta text-warning',
  ),
  queryRow: 'flex flex-wrap items-baseline gap-x-3 gap-y-0.5',
  queryAcct: 'inline-block min-w-[104px] font-mono text-dense-meta text-foreground/85',

  helpPanel: 'border mat-card',
  helpHead: 'flex flex-wrap items-baseline gap-2 px-3 pt-2 pb-1',
  helpCap: 'text-dense-meta font-semibold text-foreground/85',
  helpClose: cn(
    'ml-auto inline-flex h-5 items-center border px-1.5 mat-btn',
    'text-dense-meta text-muted-foreground hover:text-foreground',
  ),
  helpBody: 'grid gap-2 px-3 pb-2.5 sm:grid-cols-3',
  helpProse: 'm-0 text-dense-meta text-muted-foreground',

  tileRow: 'flex flex-wrap gap-x-7 gap-y-3 px-3 py-2.5 border-b border-border',
  tile: 'flex min-w-0 flex-col gap-0.5',
  // 11/600 sentence case (Rev .84).
  tileCap: 'text-dense-meta font-semibold text-muted-foreground',
  tileValue: 'font-mono text-base font-bold tabular-nums',
  tileSub: 'text-dense-meta text-muted-foreground',
  tileLink: 'text-dense-meta text-primary hover:underline',

  selectedRow: 'bg-primary/[0.08]',
  dormantRow: 'text-muted-foreground',

  cutNote: 'ml-auto text-dense-meta text-muted-foreground',
  composedGrid: 'grid grid-cols-1 gap-3 xl:grid-cols-2 xl:items-start',
  unpricedNote: 'flex items-start gap-1.5 text-dense-meta text-muted-foreground',
  unpricedDot: cn('mt-1 h-2 w-2 shrink-0 rounded-full', lampDotClass('gray')),

  emptyHoldings: 'flex flex-col items-center gap-1.5 px-3 py-8 text-center',
  emptyHoldingsTitle: 'inline-flex items-center gap-1.5 text-sm font-semibold text-foreground/85',
  emptyHoldingsBody: 'max-w-[26rem] text-dense-meta text-muted-foreground',

  sectionHint: denseTable.emptyHint,
  tableFoot: cn(
    'flex flex-wrap gap-x-4 gap-y-1.5 border-t border-border px-3 py-1.5',
    'text-dense-meta text-muted-foreground',
  ),
} as const
