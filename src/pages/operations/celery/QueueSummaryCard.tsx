import { StatusLamp } from '@/components/StatusLamp'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { CeleryQueueSummaryTable } from './CeleryQueueSummaryTable'
import { CelerySectionCard } from './CelerySectionCard'
import { useCeleryOps } from './useCeleryOps'
import {
  useOpsWorkers,
  useOpsQueuesSummary,
  useAggregatedJobQueuesSummary,
} from '@/hooks/useOpsData'
import { computeCeleryRuntimeLamp, runtimeLampText } from '@/utils/celeryRuntime'
import type { AggregatedJobQueueSummaryRow } from '@/types/ops'
import type { CeleryStatusFilter } from './celeryTypes'

const QUEUE_SUMMARY_TOOLTIP =
  'Broker (R/C) and PostgreSQL job counts (P/R/D/F) for every queue. Click PG counts to jump to the job list with a status filter. Filter icon opens Support Tasks matrix. Alt+click PG or St. lamp opens Console.'

export interface QueueSummaryCardProps {
  onNavigateToQueue: (celeryQueue: string, status?: CeleryStatusFilter) => void
  onNavigateQueueConsole: (celeryQueue: string) => void
  onToggleSupportTasksFilter: (brokerKey: string) => void
  onClearWorkerQueueFilter: () => void
  highlightQueueName?: string | null
  activeSupportTasksFilterKey?: string | null
}

export function QueueSummaryCard({
  onNavigateToQueue,
  onNavigateQueueConsole,
  onToggleSupportTasksFilter,
  onClearWorkerQueueFilter,
  highlightQueueName,
  activeSupportTasksFilterKey,
}: QueueSummaryCardProps) {
  const { canOperate } = useCeleryOps()
  const { data: workersData } = useOpsWorkers()
  const {
    data: queuesData,
    isLoading: queuesLoading,
    isError: queuesError,
    error: queuesErr,
  } = useOpsQueuesSummary()
  const { data: aggData, isLoading: aggLoading } = useAggregatedJobQueuesSummary()
  const busyQueue = null

  const workers = workersData?.workers ?? []
  const brokerConnected = workersData?.broker.connected
  const queueSummary = queuesData?.queues ?? []
  const aggRows = aggData?.rows ?? []
  const loading = queuesLoading || aggLoading

  const runtimeLamp = computeCeleryRuntimeLamp(brokerConnected ?? false, workers)
  const lampText = runtimeLampText(runtimeLamp)

  function handleDeletePending(_row: AggregatedJobQueueSummaryRow): Promise<void> {
    return Promise.resolve()
  }

  function handleDeleteRunning(_row: AggregatedJobQueueSummaryRow): Promise<void> {
    return Promise.resolve()
  }

  function handleDeleteDone(_row: AggregatedJobQueueSummaryRow): Promise<void> {
    return Promise.resolve()
  }

  function handleDeleteFailed(_row: AggregatedJobQueueSummaryRow): Promise<void> {
    return Promise.resolve()
  }

  function handleResetFailed(_row: AggregatedJobQueueSummaryRow): Promise<void> {
    return Promise.resolve()
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
          canOperate={canOperate}
          highlightQueueName={highlightQueueName}
          activeSupportTasksFilterKey={activeSupportTasksFilterKey}
          onNavigateToQueue={onNavigateToQueue}
          onNavigateQueueConsole={onNavigateQueueConsole}
          onToggleSupportTasksFilter={onToggleSupportTasksFilter}
          onClearWorkerQueueFilter={onClearWorkerQueueFilter}
          onDeletePending={handleDeletePending}
          onDeleteRunning={handleDeleteRunning}
          onDeleteDone={handleDeleteDone}
          onDeleteFailed={handleDeleteFailed}
          onResetFailed={handleResetFailed}
        />
      </CelerySectionCard>
    </>
  )
}
