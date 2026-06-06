/** Shared class names for compact data tables (Positions, Ledger, Performance). */
export const denseTable = {
  /** Applied by DenseDataTable — fixed layout keeps columns stable when rows expand. */
  table: 'w-full min-w-[320px] table-fixed border-collapse text-[length:var(--text-dense)]',
  /** Title + table stack — use on the wrapper around sectionTitle + DenseDataTable. */
  sectionBlock: 'flex min-w-0 flex-col gap-3',
  sectionTitle: 'text-sm font-semibold tracking-tight text-foreground',
  emptyHint: 'text-xs text-muted-foreground',
  sortableHead: 'cursor-pointer select-none hover:text-foreground',
  mutedMeta: 'text-muted-foreground text-[length:var(--text-dense-meta)]',
  /** Long text in expand/detail rows — clip within col width instead of pushing columns. */
  detailCellClip: 'min-w-0 overflow-hidden',
  detailRowLabel: 'block truncate',
  /**
   * Identity columns (Symbol, Contract, Strategy, Instance) — never ellipsis; wrap instead.
   * Apply on DenseTableCell; pair links/tags with denseTableEntityLink or flex-wrap.
   */
  entityCell:
    'min-w-0 max-w-none overflow-visible whitespace-normal break-words [overflow-wrap:anywhere] align-top',
  /** DenseLinkButton / strong labels inside entity cells — no truncate. */
  entityLink: 'block w-full max-w-full whitespace-normal break-words text-left',
  /** Horizontal scroll container — muted slate thumb, transparent track (see index.css). */
  scrollX: 'dense-scroll-x',
  /**
   * Expand/collapse chevron column — overrides default td max-w-0 overflow-hidden
   * so IconActionButton / ExpandToggleCell stays visible in table-fixed layouts.
   */
  expandCol: 'w-8 max-w-none shrink-0 overflow-visible px-0.5',
  expandColCell: 'w-8 max-w-none shrink-0 overflow-visible p-0 align-middle',
} as const

export const denseTableCellPadding =
  'py-[var(--table-cell-py)] px-[var(--table-cell-px)]'

/** Right-aligned numeric columns (DenseTableHead / DenseTableCell). */
export const denseTableNumCell = 'text-right font-mono tabular-nums'

/** @see denseTable.entityCell */
export const denseTableEntityCell = denseTable.entityCell

/** @see denseTable.entityLink */
export const denseTableEntityLink = denseTable.entityLink
