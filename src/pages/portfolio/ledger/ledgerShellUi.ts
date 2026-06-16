import { cn } from '@/lib/utils'

/** Trade Ledger page inner surface (elevated card on PageShell canvas). */
export const ledgerPageCardClass = cn(
  'flex flex-col gap-3 rounded-lg border border-border bg-card p-4',
)

const tabGroupCaptionBase = cn(
  'mb-1.5 block w-full rounded-md border px-2 py-1 text-center',
  'text-dense-meta font-bold uppercase tracking-[0.07em] leading-snug',
  'border-sky-500/25 bg-gradient-to-b from-sky-500/15 to-sky-500/5',
  'text-foreground shadow-[0_1px_0_rgba(0,0,0,0.12)]',
)

export const ledgerShell = {
  toolbarPanel: cn(
    'mb-3 mt-1 overflow-hidden rounded-[10px] border border-border',
    'bg-muted/25 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--foreground)_4%,transparent)]',
  ),
  toolbarTop: cn(
    'grid grid-cols-[minmax(0,1fr)_auto] items-stretch',
    'border-b border-border/80',
  ),
  toolbarSplit: 'grid min-w-0 grid-cols-[2fr_4fr]',
  toolbarAttr: 'min-w-0 border-r border-border/80 px-[0.65rem] py-2',
  toolbarInst: 'min-w-0 px-[0.65rem] py-2',
  tabGroupCaption: tabGroupCaptionBase,
  attrTabRow: 'grid grid-cols-2 gap-0',
  instTabRow: 'grid grid-cols-4 gap-0',
  splitTabBtn: cn(
    'min-w-0 cursor-pointer border-0 border-b-2 border-transparent bg-transparent',
    'px-2 py-2 text-center text-dense-body font-medium text-muted-foreground',
    'transition-colors hover:bg-muted/25 hover:text-foreground',
    'disabled:cursor-not-allowed disabled:opacity-35',
  ),
  splitTabBtnActive: cn(
    'border-b-success bg-success-soft/55 text-foreground',
  ),
  splitTabBtnInstruments: 'border-l border-border/70',
  detailViewToolbar: cn(
    'flex min-w-36 shrink-0 flex-col items-start justify-center gap-1.5',
    'border-l border-border/80 px-3 py-2',
  ),
  detailViewLabel: 'whitespace-nowrap text-dense-meta text-muted-foreground',
  toolbarFilters: 'block w-full min-w-0 border-t border-border/80 px-[0.65rem] py-2',
  toolbarFiltersInner: 'flex w-full min-w-0 flex-col gap-2',
  filterSegmentInlineRow: 'flex min-w-0 flex-wrap items-center gap-x-5 gap-y-1.5',
  filterSegmentRow: 'flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1',
  tabFilterLabel: 'shrink-0 text-xs font-semibold text-muted-foreground',
  filterMetaInline: 'text-xs text-muted-foreground',
  containOpenDisabled: 'pointer-events-none opacity-55',
  symbolCombobox: 'relative min-w-28',
  symbolInput: cn(
    'h-[1.875rem] w-full min-w-28 rounded-sm border border-border bg-background',
    'px-2 text-dense-body text-foreground',
  ),
  symbolList: cn(
    'absolute left-0 right-0 top-[calc(100%+2px)] z-40 m-0 max-h-48',
    'list-none overflow-auto rounded-md border border-border bg-popover p-1',
    'shadow-[0_4px_12px_rgb(0_0_0/0.25)]',
  ),
  symbolOption: 'cursor-pointer px-2 py-1 text-xs hover:bg-muted',
  symbolOptionActive: 'bg-muted',
} as const

export function ledgerSplitTabClass(active: boolean, instrumentsFirst?: boolean): string {
  return cn(
    ledgerShell.splitTabBtn,
    active && ledgerShell.splitTabBtnActive,
    instrumentsFirst && ledgerShell.splitTabBtnInstruments,
  )
}
