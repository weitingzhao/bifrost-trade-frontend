/** Column widths for Harness Console dense tables (table-fixed + colgroup). */
export const HARNESS_OBJECTIVES_COL_WIDTHS = {
  // The expand column is a fixed 2rem in the shared token; the rest share what
  // is left. Persona moved into the title's sub-line, and Runs took its place —
  // an objective's run count is what you look for before opening it.
  expand: '2rem',
  title: '42%',
  schedule: '12%',
  runs: '14%',
  status: '10%',
  actions: '20%',
} as const

export function HarnessObjectivesColgroup() {
  return (
    <colgroup>
      <col style={{ width: HARNESS_OBJECTIVES_COL_WIDTHS.expand }} />
      <col style={{ width: HARNESS_OBJECTIVES_COL_WIDTHS.title }} />
      <col style={{ width: HARNESS_OBJECTIVES_COL_WIDTHS.schedule }} />
      <col style={{ width: HARNESS_OBJECTIVES_COL_WIDTHS.runs }} />
      <col style={{ width: HARNESS_OBJECTIVES_COL_WIDTHS.status }} />
      <col style={{ width: HARNESS_OBJECTIVES_COL_WIDTHS.actions }} />
    </colgroup>
  )
}
