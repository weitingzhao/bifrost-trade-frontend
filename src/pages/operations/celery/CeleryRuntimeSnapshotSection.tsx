import { useCallback, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { StatusLamp } from '@/components/StatusLamp'
import { CelerySectionCard } from './CelerySectionCard'
import { ConfirmDialog } from './ConfirmDialog'
import { WorkerRuntimeCard } from './console/WorkerRuntimeCard'
import { useScaleWorker, useWorkerInstances, useOpsWorkers } from '@/hooks/useOpsData'
import { useCeleryOps } from './CeleryOpsContext'
import { computeCeleryRuntimeLamp, runtimeLampText } from '@/utils/celeryRuntime'
import { workerIdToInstanceId } from '@/utils/celeryWorkerDisplay'
import { cn } from '@/lib/utils'

const RUNTIME_INFO =
  'Broker from Redis; workers from Redis presence + Celery inspect. Worker Dev/Prod badge = that process BIFROST_CONFIG. Remove stops the unit on the Ops control host.'

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
  const { canOperate, showFlash } = useCeleryOps()
  const { data, isLoading, isFetching, refetch } = useOpsWorkers()
  const { data: instancesData } = useWorkerInstances()
  const scaleMut = useScaleWorker()

  const [confirm, setConfirm] = useState<{
    open: boolean
    title: string
    message: string
    instanceId: string
  } | null>(null)
  const [scaleMsg, setScaleMsg] = useState<{ text: string; isErr: boolean } | null>(null)

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

  function requestRemove(instanceId: string, workerId: string) {
    setConfirm({
      open: true,
      title: 'Remove worker instance?',
      message: `Stop systemd unit for instance ${instanceId} (${workerId}) on the Ops control host.`,
      instanceId,
    })
  }

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
      {scaleMsg && (
        <Alert variant={scaleMsg.isErr ? 'destructive' : 'default'} className="mb-4">
          <AlertDescription>{scaleMsg.text}</AlertDescription>
        </Alert>
      )}

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
              Worker Instances lists matching OS processes (e.g. <code className="text-xs">run_celery.py</code>).
              Runtime Snapshot only shows workers returned by <strong>Celery inspect</strong> on the configured
              broker. If you just added an instance, wait a few seconds for the next poll; if this stays empty,
              check the worker terminal for errors and that it uses the same Redis as Ops.
            </p>
          ) : (
            <p>
              No workers detected. Start a Celery worker:{' '}
              <code className="text-xs">python scripts/systemd/run_celery.py</code>
            </p>
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
              onRemove={() => {
                const instanceId = workerIdToInstanceId(w.worker_id)
                if (!instanceId) {
                  setScaleMsg({ text: `Cannot infer instance ID from ${w.worker_id}`, isErr: true })
                  return
                }
                requestRemove(instanceId, w.worker_id)
              }}
              removeDisabled={scaleMut.isPending || !canOperate}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirm?.open ?? false}
        title={confirm?.title ?? ''}
        message={confirm?.message ?? ''}
        confirming={scaleMut.isPending}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (!confirm) return
          scaleMut.mutate(
            { action: 'remove', instance_id: confirm.instanceId },
            {
              onSuccess: res => {
                setScaleMsg({
                  text: res.ok ? `Removed ${confirm.instanceId}` : (res.error ?? 'Remove failed'),
                  isErr: !res.ok,
                })
                showFlash(
                  res.ok ? `Removed ${confirm.instanceId}` : (res.error ?? 'Remove failed'),
                  !res.ok,
                )
                setConfirm(null)
              },
              onError: e => {
                setScaleMsg({ text: e instanceof Error ? e.message : 'Remove failed', isErr: true })
                setConfirm(null)
              },
            },
          )
        }}
      />
    </CelerySectionCard>
  )
}
