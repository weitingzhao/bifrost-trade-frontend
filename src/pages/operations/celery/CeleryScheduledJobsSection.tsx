import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { CelerySectionCard } from './CelerySectionCard'
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
      ) : beatTasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No beat tasks returned from capabilities.</p>
      ) : (
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-1.5">
            Celery Beat (scheduled)
            <InfoTooltip text="Tasks invoked on a schedule by Celery Beat. Most enqueue run_massive_job." />
          </h4>
          <div className="overflow-x-auto rounded-md border">
            <Table className="text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead>Task name</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {beatTasks.map(b => (
                  <TableRow key={b.name}>
                    <TableCell>
                      <code className="font-mono text-[11px] break-all">{b.name}</code>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{b.note}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </CelerySectionCard>
  )
}
