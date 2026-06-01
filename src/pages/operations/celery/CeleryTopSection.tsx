import type { CeleryStatusFilter } from './celeryTypes'
import { CELERY_SPLIT_GRID } from './celeryLayoutClasses'
import { QueueSummaryCard } from './QueueSummaryCard'
import { WorkerInstanceSituationCard } from './WorkerInstanceSituationCard'

export interface CeleryTopSectionProps {
  onNavigateToQueue: (celeryQueue: string, status?: CeleryStatusFilter) => void
}

export function CeleryTopSection({ onNavigateToQueue }: CeleryTopSectionProps) {
  return (
    <div className={CELERY_SPLIT_GRID}>
      <QueueSummaryCard onNavigateToQueue={onNavigateToQueue} />
      <WorkerInstanceSituationCard />
    </div>
  )
}
