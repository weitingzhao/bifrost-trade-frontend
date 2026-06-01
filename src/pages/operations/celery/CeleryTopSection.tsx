import type { CeleryStatusFilter } from './celeryTypes'
import { CELERY_SPLIT_GRID } from './celeryLayoutClasses'
import { QueueSummaryCard } from './QueueSummaryCard'
import { WorkerInstanceSituationCard } from './WorkerInstanceSituationCard'

export interface CeleryTopSectionProps {
  onNavigateToQueue: (celeryQueue: string, status?: CeleryStatusFilter) => void
  onNavigateQueueConsole: (celeryQueue: string) => void
  onToggleSupportTasksFilter: (brokerKey: string) => void
  onClearWorkerQueueFilter: () => void
  queueFilter: string | null
  activeSupportTasksFilterKey: string | null
}

export function CeleryTopSection({
  onNavigateToQueue,
  onNavigateQueueConsole,
  onToggleSupportTasksFilter,
  onClearWorkerQueueFilter,
  queueFilter,
  activeSupportTasksFilterKey,
}: CeleryTopSectionProps) {
  return (
    <div className={CELERY_SPLIT_GRID}>
      <QueueSummaryCard
        onNavigateToQueue={onNavigateToQueue}
        onNavigateQueueConsole={onNavigateQueueConsole}
        onToggleSupportTasksFilter={onToggleSupportTasksFilter}
        onClearWorkerQueueFilter={onClearWorkerQueueFilter}
        highlightQueueName={queueFilter}
        activeSupportTasksFilterKey={activeSupportTasksFilterKey}
      />
      <WorkerInstanceSituationCard />
    </div>
  )
}
