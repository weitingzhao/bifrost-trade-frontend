export type CeleryStatusFilter = 'all' | 'pending' | 'running' | 'done' | 'failed'

export type CeleryMainTab =
  | 'queues_instances'
  | 'console_runtime'
  | 'support_tasks'
  | 'scheduled_jobs'

export const CELERY_MAIN_TABS: { value: CeleryMainTab; label: string }[] = [
  { value: 'queues_instances', label: 'Queues & Instances' },
  { value: 'console_runtime', label: 'Console & Runtime' },
  { value: 'support_tasks', label: 'Support Tasks' },
  { value: 'scheduled_jobs', label: 'Scheduled Jobs' },
]

export function isCeleryMainTab(value: string | null): value is CeleryMainTab {
  return (
    value === 'queues_instances' ||
    value === 'console_runtime' ||
    value === 'support_tasks' ||
    value === 'scheduled_jobs'
  )
}
