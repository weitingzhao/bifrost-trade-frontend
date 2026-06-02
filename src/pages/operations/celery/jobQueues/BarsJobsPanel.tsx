import { useMemo, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useBarsJobs,
  useDeleteAllBarsJobs,
  useRetryBarsJob,
  useRetryFailedBarsJobs,
  useTrimBarsJobs,
} from '@/hooks/useOpsData'
import { useCeleryOps } from '../useCeleryOps'
import { BarsJobsTable } from './BarsJobsTable'
import { JobQueueBulkToolbar } from './JobQueueBulkToolbar'
import type { ConfirmState, StatusFilter } from './jobQueueTypes'

export interface BarsJobsPanelProps {
  statusFilter: StatusFilter
  limit: number
  onConfirm: (state: ConfirmState) => void
  onMsg: (text: string, isErr: boolean) => void
}

export function BarsJobsPanel({ statusFilter, limit, onConfirm, onMsg }: BarsJobsPanelProps) {
  const { canOperate } = useCeleryOps()
  const opDisabled = !canOperate
  const filter = useMemo(
    () => ({
      limit,
      offset: 0,
      status: statusFilter === 'all' ? null : statusFilter,
    }),
    [limit, statusFilter],
  )

  const { data, isLoading, isError, error, refetch, isFetching } = useBarsJobs(filter)
  const retryJob = useRetryBarsJob()
  const deleteAll = useDeleteAllBarsJobs()
  const retryFailed = useRetryFailedBarsJobs()
  const trim = useTrimBarsJobs()
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
        trimLabel="Trim bars jobs"
        onTrim={() => {
          const n = parseInt(keepLast, 10)
          if (!Number.isFinite(n) || n < 1) { onMsg('Enter a number between 1 and 50000.', true); return }
          onConfirm({
            title: 'Trim bars jobs',
            message: `Keep only the newest ${n} rows by ID.`,
            action: async () => {
              const r = await trim.mutateAsync(n)
              onMsg(`Removed ${r.deleted} older job(s); kept ${n} newest.`, !r.ok)
            },
          })
        }}
        bulkActions={{
          deletePending: async () => {
            const r = await deleteAll.mutateAsync({ status: 'pending' })
            onMsg(`Deleted ${r.deleted} job(s).`, !r.ok)
          },
          deleteRunning: async () => {
            const r = await deleteAll.mutateAsync({ status: 'running' })
            onMsg(`Deleted ${r.deleted} job(s).`, !r.ok)
          },
          deleteDone: async () => {
            const r = await deleteAll.mutateAsync({ status: 'done' })
            onMsg(`Deleted ${r.deleted} job(s).`, !r.ok)
          },
          deleteFailed: async () => {
            const r = await deleteAll.mutateAsync({ status: 'failed' })
            onMsg(`Deleted ${r.deleted} job(s).`, !r.ok)
          },
          retryFailed: async () => {
            const r = await retryFailed.mutateAsync(500)
            onMsg(
              `Reset ${r.reset ?? 0}, enqueued ${r.enqueued ?? 0}.`,
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
        <BarsJobsTable
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
