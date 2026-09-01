/** Column widths for Harness Console dense tables (table-fixed + colgroup). */
export const HARNESS_OBJECTIVES_COL_WIDTHS = {
  title: '40%',
  schedule: '14%',
  persona: '18%',
  status: '12%',
  actions: '16%',
} as const

export const HARNESS_RUNS_COL_WIDTHS = {
  run: '14%',
  objective: '28%',
  started: '22%',
  status: '14%',
  actions: '22%',
} as const

export function HarnessObjectivesColgroup() {
  return (
    <colgroup>
      <col style={{ width: HARNESS_OBJECTIVES_COL_WIDTHS.title }} />
      <col style={{ width: HARNESS_OBJECTIVES_COL_WIDTHS.schedule }} />
      <col style={{ width: HARNESS_OBJECTIVES_COL_WIDTHS.persona }} />
      <col style={{ width: HARNESS_OBJECTIVES_COL_WIDTHS.status }} />
      <col style={{ width: HARNESS_OBJECTIVES_COL_WIDTHS.actions }} />
    </colgroup>
  )
}

export function HarnessRunsColgroup() {
  return (
    <colgroup>
      <col style={{ width: HARNESS_RUNS_COL_WIDTHS.run }} />
      <col style={{ width: HARNESS_RUNS_COL_WIDTHS.objective }} />
      <col style={{ width: HARNESS_RUNS_COL_WIDTHS.started }} />
      <col style={{ width: HARNESS_RUNS_COL_WIDTHS.status }} />
      <col style={{ width: HARNESS_RUNS_COL_WIDTHS.actions }} />
    </colgroup>
  )
}
