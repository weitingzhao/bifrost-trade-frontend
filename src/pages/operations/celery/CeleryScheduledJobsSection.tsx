import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  denseTable,
} from '@/components/data-display'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { CelerySectionCard } from './CelerySectionCard'
import { CELERY_SCHEDULED_JOBS_COL_WIDTHS, celerySectionTitleClass } from './celeryUi'
import {
  useCeleryCapabilitiesTab,
  useInvalidateCeleryCapabilities,
} from '@/hooks/useCeleryCapabilitiesTab'
import type { CeleryMainTab } from './celeryTypes'

const SCHEDULED_JOBS_INFO =
  'Celery Beat task names from GET /ops/celery/capabilities. UTC cron-style times are in Scheduled Celery Beat on the Queues tab sidebar (Research API).'

export function CeleryScheduledJobsSection({ mainTab }: { mainTab: CeleryMainTab }) {
  const { data, isLoading, isError, error, isFetching } = useCeleryCapabilitiesTab(mainTab)
  const invalidate = useInvalidateCeleryCapabilities()
  const beatTasks = data?.beat_tasks ?? []
  const consumingQueues = data?.consuming_queues ?? []

  return (
    <CelerySectionCard
      title={
        <>
          Scheduled Jobs
          <InfoTooltip text={SCHEDULED_JOBS_INFO} />
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
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-24 w-full" />
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
        <div className="space-y-2">
          {data?.beat_running === false && (
            <Alert variant="destructive">
              <AlertDescription>Celery Beat is not running — schedules will not enqueue.</AlertDescription>
            </Alert>
          )}
          {data?.beat_running === true && (
            <p className="text-dense-meta text-success" role="status">
              Beat running
            </p>
          )}
          {consumingQueues.length > 0 && (
            <p className={denseTable.mutedMeta}>
              Consuming queues:{' '}
              <code className="font-mono">{consumingQueues.join(', ')}</code>
            </p>
          )}
          {beatTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No beat tasks returned from capabilities.</p>
          ) : (
            <>
          <h4 className={celerySectionTitleClass}>
            Celery Beat (scheduled)
            <InfoTooltip text="Tasks invoked on a schedule by Celery Beat. Most enqueue run_massive_job." />
          </h4>
          <DenseDataTable>
            <colgroup>
              <col style={{ width: CELERY_SCHEDULED_JOBS_COL_WIDTHS.task }} />
              <col style={{ width: CELERY_SCHEDULED_JOBS_COL_WIDTHS.note }} />
            </colgroup>
            <DenseTableHeader>
              <DenseTableHeadRow>
                <DenseTableHead>Task name</DenseTableHead>
                <DenseTableHead>Note</DenseTableHead>
              </DenseTableHeadRow>
            </DenseTableHeader>
            <DenseTableBody>
              {beatTasks.map(b => (
                <DenseTableRow key={b.name}>
                  <DenseTableCell>
                    <code className="font-mono text-dense-meta break-all">{b.name}</code>
                  </DenseTableCell>
                  <DenseTableCell className={denseTable.mutedMeta}>{b.note}</DenseTableCell>
                </DenseTableRow>
              ))}
            </DenseTableBody>
          </DenseDataTable>
            </>
          )}
        </div>
      )}
    </CelerySectionCard>
  )
}
