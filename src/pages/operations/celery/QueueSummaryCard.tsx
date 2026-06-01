import { useState } from 'react'
import { StatusLamp } from '@/components/StatusLamp'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { CeleryQueueSummaryTable } from './CeleryQueueSummaryTable'
import { CelerySectionCard } from './CelerySectionCard'
import { ConfirmDialog } from './ConfirmDialog'
import {
  useOpsWorkers,
  useOpsQueuesSummary,
  useAggregatedJobQueuesSummary,
  useDeleteAllMassiveJobs,
  useDeleteAllBarsJobs,
  useRetryFailedMassiveJobs,
  useRetryFailedBarsJobs,
} from '@/hooks/useOpsData'
import { computeCeleryRuntimeLamp, runtimeLampText } from '@/utils/celeryRuntime'
import type { AggregatedJobQueueSummaryRow } from '@/types/ops'
import type { CeleryStatusFilter } from './celeryTypes'

const QUEUE_SUMMARY_TOOLTIP =
  'Broker (R/C) and PostgreSQL job counts (P/R/D/F) for every queue. Click PG counts to jump to the job list with a status filter. Action icons delete or reset failed rows.'

export interface QueueSummaryCardProps {
  onNavigateToQueue: (celeryQueue: string, status?: CeleryStatusFilter) => void
}

export function QueueSummaryCard({ onNavigateToQueue }: QueueSummaryCardProps) {
  const { data: workersData } = useOpsWorkers()
  const {
    data: queuesData,
    isLoading: queuesLoading,
    isError: queuesError,
    error: queuesErr,
  } = useOpsQueuesSummary()
  const { data: aggData, isLoading: aggLoading } = useAggregatedJobQueuesSummary()
  const deleteMassive = useDeleteAllMassiveJobs()
  const deleteBars = useDeleteAllBarsJobs()
  const retryMassive = useRetryFailedMassiveJobs()
  const retryBars = useRetryFailedBarsJobs()
  const [busyQueue, setBusyQueue] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<{
    title: string
    message: string
    action: () => Promise<void>
  } | null>(null)

  const workers = workersData?.workers ?? []
  const brokerConnected = workersData?.broker.connected
  const queueSummary = queuesData?.queues ?? []
  const aggRows = aggData?.rows ?? []
  const loading = queuesLoading || aggLoading

  const runtimeLamp = computeCeleryRuntimeLamp(brokerConnected ?? false, workers)
  const lampText = runtimeLampText(runtimeLamp)

  function openConfirm(
    title: string,
    message: string,
    action: () => Promise<void>,
  ) {
    setConfirm({ title, message, action })
  }

  async function withBusyQueue(queue: string, fn: () => Promise<void>) {
    setBusyQueue(queue)
    try {
      await fn()
    } finally {
      setBusyQueue(null)
    }
  }

  function handleDeletePending(row: AggregatedJobQueueSummaryRow) {
    openConfirm(
      `Delete pending — ${row.celery_queue}`,
      'Permanently delete all pending rows in this queue. Cannot be undone.',
      () =>
        withBusyQueue(row.celery_queue, async () => {
          if (row.pipeline === 'massive_async') {
            await deleteMassive.mutateAsync({ status: 'pending', celeryQueue: row.celery_queue })
          } else {
            await deleteBars.mutateAsync({ status: 'pending' })
          }
        }),
    )
  }

  function handleDeleteRunning(row: AggregatedJobQueueSummaryRow) {
    openConfirm(
      `Delete running — ${row.celery_queue}`,
      'Removes PostgreSQL rows only. Worker may still execute. Cannot be undone.',
      () =>
        withBusyQueue(row.celery_queue, async () => {
          if (row.pipeline === 'massive_async') {
            await deleteMassive.mutateAsync({ status: 'running', celeryQueue: row.celery_queue })
          } else {
            await deleteBars.mutateAsync({ status: 'running' })
          }
        }),
    )
  }

  function handleDeleteDone(row: AggregatedJobQueueSummaryRow) {
    openConfirm(
      `Delete done — ${row.celery_queue}`,
      'Permanently delete all done rows. Cannot be undone.',
      () =>
        withBusyQueue(row.celery_queue, async () => {
          if (row.pipeline === 'massive_async') {
            await deleteMassive.mutateAsync({ status: 'done', celeryQueue: row.celery_queue })
          } else {
            await deleteBars.mutateAsync({ status: 'done' })
          }
        }),
    )
  }

  function handleDeleteFailed(row: AggregatedJobQueueSummaryRow) {
    openConfirm(
      `Delete failed — ${row.celery_queue}`,
      'Permanently delete all failed rows. Cannot be undone.',
      () =>
        withBusyQueue(row.celery_queue, async () => {
          if (row.pipeline === 'massive_async') {
            await deleteMassive.mutateAsync({ status: 'failed', celeryQueue: row.celery_queue })
          } else {
            await deleteBars.mutateAsync({ status: 'failed' })
          }
        }),
    )
  }

  function handleResetFailed(row: AggregatedJobQueueSummaryRow) {
    openConfirm(
      `Reset failed — ${row.celery_queue}`,
      'Reset up to 500 oldest failed jobs to pending and re-queue Celery.',
      () =>
        withBusyQueue(row.celery_queue, async () => {
          if (row.pipeline === 'massive_async') {
            await retryMassive.mutateAsync({ celeryQueue: row.celery_queue, limit: 500 })
          } else {
            await retryBars.mutateAsync(500)
          }
        }),
    )
  }

  if (queuesError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{(queuesErr as Error).message}</AlertDescription>
      </Alert>
    )
  }

  return (
    <>
      <CelerySectionCard
        title={
          <>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <StatusLamp lamp={runtimeLamp} />
                  </span>
                </TooltipTrigger>
                <TooltipContent>{lampText}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            Queue Summary
            {queuesData?.db_connected === false && (
              <Badge variant="secondary" className="ml-1 text-xs font-normal">
                DB unavailable
              </Badge>
            )}
          </>
        }
        tooltip={QUEUE_SUMMARY_TOOLTIP}
        contentClassName="p-0"
      >
        <CeleryQueueSummaryTable
          queueSummary={queueSummary}
          aggregatedRows={aggRows}
          dbConnected={queuesData?.db_connected ?? null}
          loading={loading}
          workers={workers}
          brokerConnected={brokerConnected}
          runtimeLamp={runtimeLamp}
          runtimeLampText={lampText}
          busyQueue={busyQueue}
          onNavigateToQueue={onNavigateToQueue}
          onDeletePending={handleDeletePending}
          onDeleteRunning={handleDeleteRunning}
          onDeleteDone={handleDeleteDone}
          onDeleteFailed={handleDeleteFailed}
          onResetFailed={handleResetFailed}
        />
      </CelerySectionCard>

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.title ?? ''}
        message={confirm?.message ?? ''}
        onConfirm={async () => {
          await confirm?.action()
          setConfirm(null)
        }}
        onCancel={() => setConfirm(null)}
      />
    </>
  )
}
