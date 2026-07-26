import { useCallback } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { StatusLamp } from '@/components/StatusLamp'
import { CelerySectionCard } from './CelerySectionCard'
import { WorkerRuntimeCard } from './console/WorkerRuntimeCard'
import { useWorkerInstances, useOpsWorkers } from '@/hooks/useOpsData'
import { computeCeleryRuntimeLamp, runtimeLampText } from '@/utils/celeryRuntime'
import { cn } from '@/lib/utils'

const RUNTIME_INFO =
  'Broker from Redis; workers from Redis presence + Celery inspect. Worker Dev/Prod badge = that process BIFROST_CONFIG.'

export type ConsoleTarget = 'none' | 'broker' | string

export interface CeleryRuntimeSnapshotSectionProps {
  consoleTarget: ConsoleTarget
  onSelectConsole: (target: ConsoleTarget) => void
  onScrollToConsole?: () => void
}

export function CeleryRuntimeSnapshotSection({
  consoleTarget,
  onSelectConsole,
  onScrollToConsole,
}: CeleryRuntimeSnapshotSectionProps) {
  const { data, isLoading, isFetching, refetch } = useOpsWorkers()
  const { data: instancesData } = useWorkerInstances()

  const workers = data?.workers ?? []
  const broker = data?.broker
  const instances = instancesData?.instances ?? []
  const runtimeLamp = computeCeleryRuntimeLamp(broker?.connected === true, workers)

  const pickConsole = useCallback(
    (target: ConsoleTarget) => {
      onSelectConsole(target)
      onScrollToConsole?.()
    },
    [onSelectConsole, onScrollToConsole],
  )

  return (
    <CelerySectionCard
      title={
        <>
          Runtime Snapshot
          <InfoTooltip text={RUNTIME_INFO} />
        </>
      }
      headerExtra={
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1"
          disabled={isFetching}
          onClick={() => void refetch()}
        >
          <RefreshCw className={cn('h-3 w-3', isFetching && 'animate-spin')} />
          Refresh
        </Button>
      }
    >
      <div className="flex items-center gap-2 mb-4 text-sm" role="status">
        <StatusLamp lamp={runtimeLamp} className="h-3 w-3" />
        <strong>Celery (aggregate)</strong>
        <span className="text-muted-foreground">{runtimeLampText(runtimeLamp)}</span>
        <InfoTooltip text="Red: broker unreachable. Yellow: broker OK but no workers or missing queue coverage. Green: at least one worker covering all supported queues." />
      </div>

      {/* Broker summary */}
      <div
        role="button"
        tabIndex={0}
        className={cn(
          'rounded-lg border bg-muted/20 p-3 mb-4 text-xs cursor-pointer hover:bg-muted/40 transition-colors',
          consoleTarget === 'broker' && 'ring-2 ring-primary/50 border-primary/40',
        )}
        title="Open broker console stream"
        onClick={() => pickConsole('broker')}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            pickConsole('broker')
          }
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <StatusLamp lamp={broker?.connected ? 'green' : 'red'} className="h-2.5 w-2.5" />
          <strong>Broker</strong>
          <span className="text-muted-foreground">
            {broker?.connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        {broker && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
            <span title="Masked broker URL">{broker.url_masked}</span>
            {broker.used_memory_human && <span>Memory: {broker.used_memory_human}</span>}
            {broker.connected_clients != null && <span>Clients: {broker.connected_clients}</span>}
            {broker.queues && Object.keys(broker.queues).length > 0 && (
              <span>
                Queues:{' '}
                {Object.entries(broker.queues)
                  .map(([q, n]) => `${q}(${n})`)
                  .join(', ')}
              </span>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : workers.length === 0 ? (
        <div className="text-sm text-muted-foreground space-y-2">
          {instances.length > 0 ? (
            <p>
              Worker Instances lists Kubernetes workloads. Runtime Snapshot only shows workers
              returned by <strong>Celery inspect</strong> on the configured broker. If this stays
              empty, check the worker pod logs and broker configuration.
            </p>
          ) : (
            <p>No workers detected. Check the Celery worker Deployment replicas and pod readiness.</p>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {workers.map(w => (
            <WorkerRuntimeCard
              key={w.worker_id}
              worker={w}
              selected={consoleTarget === w.worker_id}
              onSelect={() => pickConsole(w.worker_id)}
            />
          ))}
        </div>
      )}
    </CelerySectionCard>
  )
}
