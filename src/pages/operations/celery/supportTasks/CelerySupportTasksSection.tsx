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
import { RegisteredCeleryTasksTable } from './RegisteredCeleryTasksTable'

const SUPPORT_TASKS_INFO =
  'GET /ops/celery/capabilities: Full worker task registry. Celery Beat task names are on the Scheduled Jobs tab.'

export interface CelerySupportTasksSectionProps {
  mainTab: CeleryMainTab
}

export function CelerySupportTasksSection({
  mainTab,
}: CelerySupportTasksSectionProps) {
  const { data, isLoading, isError, error, isFetching } = useCeleryCapabilitiesTab(mainTab)
  const invalidate = useInvalidateCeleryCapabilities()

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
        <RegisteredCeleryTasksTable tasks={tasks} />
      )}
    </CelerySectionCard>
  )
}
