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
  /** Horizontal scroll container — muted slate thumb, transparent track (see index.css). */
  scrollX: 'dense-scroll-x',
} as const

export const denseTableCellPadding =
  'py-[var(--table-cell-py)] px-[var(--table-cell-px)]'
