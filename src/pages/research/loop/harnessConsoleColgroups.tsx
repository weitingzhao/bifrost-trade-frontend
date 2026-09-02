/** Column widths for Harness Console dense tables (table-fixed + colgroup). */
export const HARNESS_OBJECTIVES_COL_WIDTHS = {
  title: '44%',
  schedule: '12%',
  persona: '16%',
  status: '10%',
  actions: '18%',
} as const

export const HARNESS_RUNS_COL_WIDTHS = {
  run: '14%',
  objective: '18%',
  funnel: '17%',
  started: '14%',
  status: '12%',
  actions: '25%',
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
      <col style={{ width: HARNESS_RUNS_COL_WIDTHS.funnel }} />
      <col style={{ width: HARNESS_RUNS_COL_WIDTHS.started }} />
      <col style={{ width: HARNESS_RUNS_COL_WIDTHS.status }} />
      <col style={{ width: HARNESS_RUNS_COL_WIDTHS.actions }} />
    </colgroup>
  )
}
