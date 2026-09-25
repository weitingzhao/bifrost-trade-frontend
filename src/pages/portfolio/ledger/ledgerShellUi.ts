import { cn } from '@/lib/utils'

/** Trade Ledger page inner surface (elevated card on PageShell canvas). */
export const ledgerPageCardClass = cn(
  'flex flex-col gap-3 border p-4 mat-card',
)

export const ledgerShell = {
  /** Section heading above a panel ("Is this book healthy", "Which question"). Accounts and Transfer use the same. */
  tierRow: 'flex flex-wrap items-center gap-x-2.5 gap-y-1',
  tierLabel: 'text-dense-caption font-bold uppercase tracking-[0.16em] text-foreground/85',
  tierRule: 'h-px min-w-8 flex-1 bg-border',
  tierNote: 'text-dense-meta text-muted-foreground',

  /** One bordered surface for the view selector and for each view's list. */
  panel: 'min-w-0 border mat-card',
  panelFoot: 'px-3 py-1.5 text-dense-meta text-muted-foreground text-pretty',

  selectorTop: 'flex flex-wrap items-start gap-x-4.5 gap-y-2.5 px-3 py-2',
  selectorGroup: 'flex min-w-0 flex-col gap-0.75',
  selectorDivider: 'w-px self-stretch bg-border',
  selectorDetail: 'ml-auto flex flex-col gap-0.75',
  selectorSub: 'flex flex-wrap items-center gap-x-4 gap-y-2 px-3 pb-2.25',
  chipRow: 'flex flex-wrap gap-1',
  inlineControl: 'inline-flex flex-wrap items-center gap-1.75',
  viewHint: 'ml-auto text-dense-meta text-muted-foreground',
  filterMetaInline: 'text-dense-meta text-muted-foreground',

  cap: 'whitespace-nowrap text-dense-caption font-semibold uppercase tracking-[0.1em] text-muted-foreground',
  capAttribution: 'text-[var(--color-link)]',
  capInstruments: 'text-[var(--color-entity-category)]',

  symbolCombobox: 'relative min-w-28',
  symbolInput: cn(
    'h-[1.875rem] w-full min-w-28 border mat-field',
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

/** A view or sub-view chip: lime when on, dim when it would show nothing. */
export function ledgerChipClass(active: boolean, empty: boolean, filled = true): string {
  return cn(
    // Rev .62: no frame — on is the accent fill, off the ink one.
    'inline-flex h-5.5 cursor-pointer items-center gap-1.25 whitespace-nowrap rounded-[8px] border border-transparent px-2',
    'text-dense-meta font-semibold transition-colors',
    active
      ? cn('text-primary', filled ? 'bg-primary/15' : 'bg-[var(--mat-btn-fill)]')
      : cn(
        'bg-[var(--mat-btn-fill)] hover:bg-[var(--mat-btn-fill-hover)] hover:text-foreground',
        empty ? 'text-[var(--color-text-dim)]' : 'text-muted-foreground',
      ),
  )
}

const groupRowSurface = 'border-0 border-b border-border bg-secondary/40 hover:bg-secondary'
const groupRowLayout =
  'flex min-w-0 cursor-pointer flex-wrap items-baseline gap-2.5 px-2.5 py-1.75 text-left text-foreground'

/** A collapsible row inside a view panel: an opportunity, an instance. */
export const ledgerGroupRowClass = cn('w-full', groupRowLayout, groupRowSurface)
/** The same row when it carries a link beside the toggle (a link cannot sit inside the button). */
export const ledgerGroupRowWrapClass = cn('flex items-center', groupRowSurface)
export const ledgerGroupRowButtonClass = cn('flex-1 border-0 bg-transparent', groupRowLayout)
