import { cn } from '@/lib/utils'
import { denseTable } from '@/components/data-display/denseTableClasses'
import type { SegmentOption } from '@/components/data-display'

/** Shared 7:5 split used for Queue Summary / Situation and Queues tab worker sidebar. */
export const CELERY_SPLIT_GRID =
  'grid grid-cols-1 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-4 items-start'

/** Legacy-style underline main tabs (shadcn TabsTrigger). */
export const CELERY_MAIN_TAB_TRIGGER =
  'rounded-none border-b-2 border-transparent px-3 pb-2 pt-1 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none'

export const CELERY_MAIN_TABS_LIST =
  'h-auto w-full justify-start gap-1 rounded-none border-b bg-transparent p-0'

/** Queue Summary row highlighted by worker queue filter. */
export const CELERY_QUEUE_ROW_FILTERED =
  'border-l-2 border-l-primary bg-primary/5'

/** Page-level flash message enter animation. */
export const CELERY_FLASH_ENTER =
  'animate-in fade-in slide-in-from-top-1 duration-300'

export const celerySectionTitleClass = denseTable.sectionTitle

export const celeryEmptyHintClass = denseTable.emptyHint

export const celeryActionMsgClass = (isErr: boolean) =>
  cn(
    'text-xs px-2 py-1 rounded',
    isErr
      ? 'text-destructive bg-destructive/10'
      : 'text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-950',
  )

export const celeryQueueSummaryMetaClass = cn('flex items-center gap-2 px-1')

export const celeryQueueSummaryTableClass = cn('table-fixed')

export const CELERY_QUEUE_SUMMARY_COL_WIDTHS = {
  status: '2rem',
  queue: 'auto',
  broker: '5rem',
  count: '3.5rem',
  actions: '9rem',
} as const

export const celeryJobQueuesToolbarClass = cn('flex flex-wrap gap-3 items-center')

export const celeryJobQueuesToolbarLabelClass = cn('text-xs text-muted-foreground')

export const CELERY_JOB_STATUS_OPTIONS: SegmentOption[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'running', label: 'Running' },
  { value: 'done', label: 'Done' },
  { value: 'failed', label: 'Failed' },
]

export const CELERY_JOB_LIMIT_OPTIONS: SegmentOption[] = [
  { value: '10', label: '10' },
  { value: '25', label: '25' },
  { value: '50', label: '50' },
  { value: '100', label: '100' },
]

export const celeryWorkerInstancesFilterBarClass = cn(
  'flex items-center gap-2 text-sm bg-muted/50 rounded px-3 py-1.5',
)

export const CELERY_WORKER_INSTANCES_COL_WIDTHS = {
  host: '4rem',
  profile: 'auto',
  queue: 'auto',
  cycle: '4rem',
  action: '5rem',
} as const

export const celeryWorkerInstancesTableClass = cn('min-w-[36rem]')

export const celeryWorkerSituationAtCapRowClass = cn(
  'bg-amber-50/50 dark:bg-amber-950/20',
)

export const celeryWorkerSituationAtCapNumClass = cn(
  'text-amber-600 dark:text-amber-400 font-semibold',
)

export const celeryWorkerSituationDevNumClass = cn(
  'text-blue-600 dark:text-blue-400 font-semibold',
)

export const celeryWorkerSituationProdNumClass = cn(
  'text-green-600 dark:text-green-400 font-semibold',
)

export const CELERY_WORKER_SITUATION_COL_WIDTHS = {
  profile: 'auto',
  max: '5rem',
  dev: '3.5rem',
  prod: '3.5rem',
} as const

export const CELERY_BEAT_SCHEDULE_COL_WIDTHS = {
  label: '30%',
  schedule: '30%',
  task: '40%',
} as const

export const CELERY_SCHEDULED_JOBS_COL_WIDTHS = {
  task: '45%',
  note: '55%',
} as const

export const CELERY_REGISTERED_TASKS_COL_WIDTHS = {
  task: '55%',
  queue: '45%',
} as const

export const celeryMatrixFilterBarClass = cn(
  'flex flex-wrap items-center gap-2 text-sm bg-muted/50 rounded-md px-3 py-2',
)

export const celeryMatrixTableClass = cn('min-w-[48rem]')

export const CELERY_MASSIVE_JOBS_COL_WIDTHS = {
  id: '6rem',
  kind: 'auto',
  goal: '12rem',
  status: '6rem',
  created: 'auto',
  result: '13rem',
  actions: '4rem',
} as const

export const CELERY_BARS_JOBS_COL_WIDTHS = {
  id: '6rem',
  symbol: 'auto',
  period: 'auto',
  status: '6rem',
  result: '10rem',
  updated: 'auto',
  actions: '4rem',
} as const
