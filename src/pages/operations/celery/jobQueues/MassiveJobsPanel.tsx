import { useMemo, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useDeleteAllMassiveJobs,
  useMassiveJobs,
  useRetryFailedMassiveJobs,
  useRetryMassiveJob,
  useTrimMassiveJobs,
} from '@/hooks/useOpsData'
import { useCeleryOps } from '../useCeleryOps'
import { JobQueueBulkToolbar } from './JobQueueBulkToolbar'
import { MassiveJobsTable } from './MassiveJobsTable'
import type { ConfirmState, JobQueueTab, StatusFilter } from './jobQueueTypes'

export interface MassiveJobsPanelProps {
  tab: JobQueueTab
  statusFilter: StatusFilter
  limit: number
  onConfirm: (state: ConfirmState) => void
  onMsg: (text: string, isErr: boolean) => void
}

export function MassiveJobsPanel({ tab, statusFilter, limit, onConfirm, onMsg }: MassiveJobsPanelProps) {
  const { canOperate } = useCeleryOps()
  const opDisabled = !canOperate
  const filter = useMemo(
    () => ({
      limit,
      offset: 0,
      status: statusFilter === 'all' ? undefined : statusFilter,
      celery_queue: tab.celeryQueue,
    }),
    [limit, statusFilter, tab.celeryQueue],
  )

  const { data, isLoading, isError, error, refetch, isFetching } = useMassiveJobs(filter)
  const retryJob = useRetryMassiveJob()
  const deleteAll = useDeleteAllMassiveJobs()
  const retryFailed = useRetryFailedMassiveJobs()
  const trim = useTrimMassiveJobs()
  const [keepLast, setKeepLast] = useState('100')

  return (
    <div className="space-y-3">
      <JobQueueBulkToolbar
        statusFilter={statusFilter}
        opDisabled={opDisabled}
        loading={isFetching}
        onRefresh={() => void refetch()}
        onConfirm={onConfirm}
        keepLast={keepLast}
        onKeepLastChange={setKeepLast}
        trimPending={trim.isPending}
        trimLabel={`Trim jobs (${tab.celeryQueue})`}
        onTrim={() => {
          const n = parseInt(keepLast, 10)
          if (!Number.isFinite(n) || n < 1) { onMsg('Enter a number between 1 and 50000.', true); return }
          onConfirm({
            title: `Trim jobs (${tab.celeryQueue})`,
            message: `Keep only the newest ${n} rows. Older rows will be deleted.`,
            action: async () => {
              const r = await trim.mutateAsync({ keep: n, celeryQueue: tab.celeryQueue })
              onMsg(`Removed ${r.deleted} older job(s); kept ${n} newest.`, !r.ok)
            },
          })
        }}
        bulkActions={{
          deletePending: async () => {
            const r = await deleteAll.mutateAsync({ status: 'pending', celeryQueue: tab.celeryQueue })
            onMsg(`Deleted ${r.deleted} job(s).`, !r.ok)
          },
          deleteRunning: async () => {
            const r = await deleteAll.mutateAsync({ status: 'running', celeryQueue: tab.celeryQueue })
            onMsg(`Deleted ${r.deleted} job(s).`, !r.ok)
          },
          deleteDone: async () => {
            const r = await deleteAll.mutateAsync({ status: 'done', celeryQueue: tab.celeryQueue })
            onMsg(`Deleted ${r.deleted} job(s).`, !r.ok)
          },
          deleteFailed: async () => {
            const r = await deleteAll.mutateAsync({ status: 'failed', celeryQueue: tab.celeryQueue })
            onMsg(`Deleted ${r.deleted} job(s).`, !r.ok)
          },
          retryFailed: async () => {
            const r = await retryFailed.mutateAsync({ celeryQueue: tab.celeryQueue, limit: 500 })
            onMsg(
              `Reset ${r.reset ?? 0}, enqueued ${r.enqueued ?? 0}${r.enqueue_errors?.length ? ' (some enqueue errors)' : ''}.`,
              Boolean(r.enqueue_errors?.length),
            )
          },
        }}
      />

      {isError && (
        <Alert variant="destructive">
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <Skeleton className="h-32 rounded" />
      ) : (
        <MassiveJobsTable
          jobs={data?.jobs ?? []}
          opDisabled={opDisabled}
          retryPending={retryJob.isPending}
          onRetry={jobId => {
            void retryJob.mutateAsync(jobId).then(r => {
              onMsg(r.ok ? `Job ${jobId} reset to pending.` : (r.error ?? 'Retry failed'), !r.ok)
            })
          }}
        />
      )}
    </div>
  )
}
