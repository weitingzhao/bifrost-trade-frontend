import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { CelerySectionCard } from '../CelerySectionCard'
import {
  useCeleryCapabilitiesTab,
  useInvalidateCeleryCapabilities,
} from '@/hooks/useCeleryCapabilitiesTab'
import type { CeleryMainTab } from '../celeryTypes'
import { RunMassiveJobMatrixTable } from './RunMassiveJobMatrixTable'
import { RegisteredCeleryTasksTable } from './RegisteredCeleryTasksTable'

const SUPPORT_TASKS_INFO =
  'GET /ops/celery/capabilities: Queue kind/mode matrix for run_massive_job and the full worker task registry below. Celery Beat task names are on the Scheduled Jobs tab.'

export interface CelerySupportTasksSectionProps {
  mainTab: CeleryMainTab
  brokerQueueFilter?: string | null
  onClearBrokerFilter?: () => void
}

export function CelerySupportTasksSection({
  mainTab,
  brokerQueueFilter = null,
  onClearBrokerFilter,
}: CelerySupportTasksSectionProps) {
  const { data, isLoading, isError, error, isFetching } = useCeleryCapabilitiesTab(mainTab)
  const invalidate = useInvalidateCeleryCapabilities()

  const matrix = data?.run_massive_job_matrix ?? []
  const tasks = data?.registered_tasks ?? []

  return (
    <CelerySectionCard
      title={
        <>
          Support Tasks
          <InfoTooltip text={SUPPORT_TASKS_INFO} />
        </>
      }
      headerExtra={
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1"
          disabled={isFetching}
          onClick={() => invalidate()}
        >
          <RefreshCw className={`h-3 w-3 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      }
    >
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : isError ? (
        <Alert variant="destructive">
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      ) : data?.error ? (
        <Alert variant="destructive">
          <AlertDescription>{data.error}</AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-8">
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-1.5">
              Queue kind / mode
              <InfoTooltip text="Documented Massive job kind and payload mode combinations (run_massive_job)." />
            </h4>
            <RunMassiveJobMatrixTable
              rows={matrix}
              brokerQueueFilter={brokerQueueFilter}
              onClearBrokerFilter={onClearBrokerFilter}
            />
          </div>
          <RegisteredCeleryTasksTable tasks={tasks} />
        </div>
      )}
    </CelerySectionCard>
  )
}
