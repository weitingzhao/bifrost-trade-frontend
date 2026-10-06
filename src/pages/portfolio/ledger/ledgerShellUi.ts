import { cn } from '@/lib/utils'

/** Ledger page inner surface (elevated card on PageShell canvas). */
export const ledgerPageCardClass = cn(
  'flex flex-col gap-3 border p-4 mat-card',
)

export const ledgerShell = {
  // Section headings are `SectionHead` h2s since Rev .84 (the lg-tier caps retired).

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

  // 11/600 sentence case (Rev .84).
  cap: 'whitespace-nowrap text-dense-meta font-semibold text-muted-foreground',
  capAttribution: 'text-[var(--color-link)]',
  capInstruments: 'text-[var(--color-entity-category)]',
} as const

/**
 * A view chip: ink 15% and full ink when on — never the accent (Rev .156
 * §17.10) — dim when it would show nothing. Sub-views are a SegmentControl.
 */
export function ledgerChipClass(active: boolean, empty: boolean): string {
  return cn(
    // Rev .62: no frame. Rev .142: a capsule. Rev .156: on is ink 15%, off the button fill.
    'inline-flex h-5.5 cursor-pointer items-center gap-1.25 whitespace-nowrap rounded-full border border-transparent px-2',
    'text-dense-meta font-semibold transition-colors',
    active
      ? 'bg-[color-mix(in_srgb,var(--sk-ink)_15%,transparent)] text-[var(--sk-ink)]'
      : cn(
        'bg-[var(--mat-btn-fill)] hover:bg-[var(--mat-btn-fill-hover)] hover:text-foreground',
        empty ? 'text-[var(--color-text-dim)]' : 'text-muted-foreground',
      ),
  )
}

// Rev .154 `.lg-grp`: the group head is a raised2 fill (ink 6% on the frost
// page) over the hairline, ink 5% under the pointer — the prototype's own pair.
const groupRowSurface =
  'border-0 border-b border-border bg-[var(--sk-raised2)] hover:bg-[color-mix(in_srgb,var(--sk-ink)_5%,transparent)]'
const groupRowLayout =
  'flex min-w-0 cursor-pointer flex-wrap items-baseline gap-2.5 px-2.5 py-1.75 text-left text-foreground'

/** A collapsible row inside a view panel: an opportunity, an instance. */
export const ledgerGroupRowClass = cn('w-full', groupRowLayout, groupRowSurface)
/** The same row when it carries a link beside the toggle (a link cannot sit inside the button). */
export const ledgerGroupRowWrapClass = cn('flex items-center', groupRowSurface)
export const ledgerGroupRowButtonClass = cn('flex-1 border-0 bg-transparent', groupRowLayout)
