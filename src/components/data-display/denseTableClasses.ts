/** Shared class names for compact data tables (Positions, Ledger, Performance). */
export const denseTable = {
  sectionTitle: 'text-sm font-semibold text-foreground mb-1',
  emptyHint: 'text-xs text-muted-foreground',
  sortableHead: 'cursor-pointer select-none hover:text-foreground',
  mutedMeta: 'text-muted-foreground text-[length:var(--text-dense-meta)]',
} as const

export const denseTableCellPadding =
  'py-[var(--table-cell-py)] px-[var(--table-cell-px)]'
