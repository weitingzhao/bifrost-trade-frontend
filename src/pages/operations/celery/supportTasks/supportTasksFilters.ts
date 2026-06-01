import type { RunMassiveJobMatrixRow } from '@/types/ops'

export type QueueKindMatrixSortColumn =
  | 'kind'
  | 'task_name'
  | 'job_style'
  | 'mode'
  | 'broker_queue'

export type MatrixModeColumnVisibility = { showMode: boolean; showModeSource: boolean }

export type MatrixEffectsSectionVisibility = {
  showFeedApi: boolean
  showDb: boolean
  showRedis: boolean
}

const MATRIX_BEAT_SCHEDULED_KIND_TO_TASK: Record<string, string> = {
  eod_pipeline: 'src.massive.tasks.beat_eod_pipeline',
  feed_stocks_corporate_action: 'src.massive.tasks.beat_corporate_watchlist',
  reconcile: 'src.massive.tasks.beat_reconcile',
  trim_jobs: 'src.massive.tasks.beat_trim_massive_jobs',
}

const MATRIX_RUN_MASSIVE_JOB_TASK_NAME = 'src.massive.tasks.run_massive_job'

export function resolvedMatrixTaskName(row: RunMassiveJobMatrixRow): string {
  const raw = (row.task_name ?? '').trim()
  if (raw) return raw
  const k = (row.kind ?? '').trim().toLowerCase()
  return MATRIX_BEAT_SCHEDULED_KIND_TO_TASK[k] ?? MATRIX_RUN_MASSIVE_JOB_TASK_NAME
}

export function resolvedMatrixJobStyle(row: RunMassiveJobMatrixRow): 'scheduled' | 'on_demand' {
  const js = row.job_style
  if (js === 'scheduled' || js === 'on_demand') return js
  const k = (row.kind ?? '').trim().toLowerCase()
  return MATRIX_BEAT_SCHEDULED_KIND_TO_TASK[k] != null ? 'scheduled' : 'on_demand'
}

export function matrixJobStyleLabel(row: RunMassiveJobMatrixRow): string {
  return resolvedMatrixJobStyle(row) === 'scheduled' ? 'Scheduled' : 'On-demand'
}

function matrixRowMatchesKindText(row: RunMassiveJobMatrixRow, needle: string): boolean {
  const q = needle.trim()
  if (!q) return true
  return row.kind.toLowerCase().includes(q.toLowerCase())
}

function matrixRowMatchesModeSourceText(row: RunMassiveJobMatrixRow, needle: string): boolean {
  const q = needle.trim()
  if (!q) return true
  const lo = q.toLowerCase()
  const modeStr = row.mode != null ? String(row.mode) : ''
  const src = row.mode_source != null ? String(row.mode_source) : ''
  return (
    modeStr.toLowerCase().includes(lo) ||
    src.toLowerCase().includes(lo) ||
    `${modeStr} · ${src}`.toLowerCase().includes(lo)
  )
}

function matrixRowMatchesTaskNameText(row: RunMassiveJobMatrixRow, needle: string): boolean {
  const q = needle.trim()
  if (!q) return true
  return resolvedMatrixTaskName(row).toLowerCase().includes(q.toLowerCase())
}

function matrixRowMatchesJobStyleToggles(
  row: RunMassiveJobMatrixRow,
  includeScheduled: boolean,
  includeOnDemand: boolean,
): boolean {
  if (!includeScheduled && !includeOnDemand) return true
  const k = resolvedMatrixJobStyle(row)
  if (k === 'scheduled') return includeScheduled
  return includeOnDemand
}

export function compareQueueKindMatrixRows(
  a: RunMassiveJobMatrixRow,
  b: RunMassiveJobMatrixRow,
  column: QueueKindMatrixSortColumn,
  direction: 'asc' | 'desc',
): number {
  const mult = direction === 'asc' ? 1 : -1
  const str = (row: RunMassiveJobMatrixRow): string => {
    switch (column) {
      case 'kind':
        return row.kind ?? ''
      case 'task_name':
        return resolvedMatrixTaskName(row)
      case 'job_style':
        return resolvedMatrixJobStyle(row)
      case 'mode':
        return `${row.mode ?? ''}\0${row.mode_source ?? ''}`
      case 'broker_queue':
        return `${row.broker_queue_standard ?? ''}\0${row.broker_queue_high ?? ''}`
      default:
        return ''
    }
  }
  return mult * str(a).localeCompare(str(b), undefined, { sensitivity: 'base', numeric: true })
}

export function sortArrow(
  column: QueueKindMatrixSortColumn,
  sort: { column: QueueKindMatrixSortColumn; direction: 'asc' | 'desc' },
): string {
  return sort.column === column ? (sort.direction === 'asc' ? ' ↑' : ' ↓') : ''
}

export interface MatrixFilterState {
  kindText: string
  modeText: string
  taskNameText: string
  includeScheduled: boolean
  includeOnDemand: boolean
  brokerQueueFilter: string | null
}

export function filterMatrixRows(
  rows: RunMassiveJobMatrixRow[],
  filters: MatrixFilterState,
): RunMassiveJobMatrixRow[] {
  let out = rows
  if (filters.brokerQueueFilter) {
    const f = filters.brokerQueueFilter
    out = out.filter(r => r.broker_queue_standard === f || r.broker_queue_high === f)
  }
  if (filters.kindText.trim()) {
    out = out.filter(r => matrixRowMatchesKindText(r, filters.kindText))
  }
  if (filters.modeText.trim()) {
    out = out.filter(r => matrixRowMatchesModeSourceText(r, filters.modeText))
  }
  if (filters.taskNameText.trim()) {
    out = out.filter(r => matrixRowMatchesTaskNameText(r, filters.taskNameText))
  }
  out = out.filter(r =>
    matrixRowMatchesJobStyleToggles(r, filters.includeScheduled, filters.includeOnDemand),
  )
  return out
}

export function normalizeMatrixRow(row: RunMassiveJobMatrixRow): RunMassiveJobMatrixRow {
  return {
    ...row,
    feed_apis: row.feed_apis ?? [],
    db_tables: row.db_tables ?? [],
    redis_nodes: row.redis_nodes ?? [],
  }
}
