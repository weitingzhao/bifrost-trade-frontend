/** Column widths for Harness Console dense tables (table-fixed + colgroup). */
export const HARNESS_OBJECTIVES_COL_WIDTHS = {
  // The expand column is a fixed 2rem in the shared token; the rest share what
  // is left. The row is a standing brief now — objective, last memo, track
  // record, cost — and the memo's headline is the widest thing on it, so it
  // takes the widest column.
  expand: '2rem',
  title: '26%',
  memo: '36%',
  record: '16%',
  cost: '10%',
  actions: '12%',
} as const

export function HarnessObjectivesColgroup() {
  return (
    <colgroup>
      <col style={{ width: HARNESS_OBJECTIVES_COL_WIDTHS.expand }} />
      <col style={{ width: HARNESS_OBJECTIVES_COL_WIDTHS.title }} />
      <col style={{ width: HARNESS_OBJECTIVES_COL_WIDTHS.memo }} />
      <col style={{ width: HARNESS_OBJECTIVES_COL_WIDTHS.record }} />
      <col style={{ width: HARNESS_OBJECTIVES_COL_WIDTHS.cost }} />
      <col style={{ width: HARNESS_OBJECTIVES_COL_WIDTHS.actions }} />
    </colgroup>
  )
}
