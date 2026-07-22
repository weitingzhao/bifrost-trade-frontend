import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { segmentButtonClass as bubbleButtonClass, segmentGroupClass as bubbleGroupClass } from '@/components/data-display'
import { cn } from '@/lib/utils'
import { CelerySectionCard } from './CelerySectionCard'
import { CeleryTerminalPanel } from './console/CeleryTerminalPanel'
import { useCeleryBrokerConsole } from '@/hooks/useCeleryBrokerConsole'
import { useCeleryWorkerConsole } from '@/hooks/useCeleryWorkerConsole'
import { useOpsWorkers } from '@/hooks/useOpsData'
import { useOpsHealth } from '@/hooks/useSocketServices'
import { useCeleryOps } from './useCeleryOps'
import type { ConsoleTarget } from './CeleryRuntimeSnapshotSection'

const CONSOLE_INFO =
  'Broker: Ops SSE (journald or tail of BIFROST_BROKER_CONSOLE_LOG on macOS). Worker: per-worker Redis stream via Ops /ops/console/worker (tail/clear: /ops/celery/logs).'

export interface CeleryConsoleSectionProps {
  consoleTarget: ConsoleTarget
  onSelectTarget: (target: ConsoleTarget) => void
  sectionRef?: React.RefObject<HTMLDivElement | null>
}

function WorkerConsoleView({ workerId, isK8s }: { workerId: string; isK8s: boolean }) {
  const ctrl = useCeleryWorkerConsole(workerId, true)
  return (
    <CeleryTerminalPanel
      lines={ctrl.lines}
      status={ctrl.status}
      errorDetail={ctrl.errorDetail}
      consoleRef={ctrl.consoleRef}
      loadingText="Connecting…"
      errorText="Unable to load (Redis/Celery broker may be down)."
      emptyText={
        isK8s
          ? 'No log lines yet. Check the Kubernetes worker Deployment and pod logs.'
          : 'No log lines yet. Start Worker: python scripts/systemd/run_celery.py'
      }
      onClear={() => void ctrl.clear()}
      onSelectAll={ctrl.selectAll}
      clearTitle="Clear displayed log and this worker's Redis stream; new lines continue when Worker runs"
    />
  )
}

function BrokerConsoleView() {
  const ctrl = useCeleryBrokerConsole(true)
  return (
    <CeleryTerminalPanel
      lines={ctrl.lines}
      status={ctrl.status}
      errorDetail={ctrl.errorDetail}
      consoleRef={ctrl.consoleRef}
      loadingText="Connecting to broker console…"
      errorText="Broker console stream failed."
      emptyText="Waiting for broker log lines…"
      showPause
      paused={ctrl.paused}
      onPauseToggle={() => ctrl.setPaused(p => !p)}
      onClear={() => ctrl.clearDisplay()}
      clearTitle="Clear displayed broker console (does not stop the stream)"
    />
  )
}

export function CeleryConsoleSection({
  consoleTarget,
  onSelectTarget,
  sectionRef,
}: CeleryConsoleSectionProps) {
  const { data } = useOpsWorkers()
  const workers = useMemo(() => data?.workers ?? [], [data?.workers])
  const { token } = useCeleryOps()
  const { data: opsHealth } = useOpsHealth(token)
  const isK8s = (opsHealth?.executor_mode ?? '').toLowerCase() === 'kubernetes'
  const hasToken = Boolean(token.trim())

  useEffect(() => {
    if (consoleTarget === 'none' || consoleTarget === 'broker') return
    const stillExists = workers.some(w => w.worker_id === consoleTarget)
    if (!stillExists) onSelectTarget('none')
  }, [workers, consoleTarget, onSelectTarget])

  function toggleTarget(target: ConsoleTarget) {
    if (consoleTarget === target) {
      onSelectTarget('none')
    } else {
      onSelectTarget(target)
    }
  }

  return (
    <div ref={sectionRef as React.RefObject<HTMLDivElement>}>
      <CelerySectionCard
        title={
          <>
            Console
            <InfoTooltip text={CONSOLE_INFO} />
          </>
        }
      >
        {!hasToken && (
          <Alert className="mb-4">
            <AlertDescription>
              Authenticate on{' '}
              <Link to="/settings/socket" className="underline font-medium">
                Socket settings
              </Link>{' '}
              to open live console streams (Ops token required).
            </AlertDescription>
          </Alert>
        )}

        <div className={cn(bubbleGroupClass('sm'), 'flex-wrap mb-4')} role="group">
          <button
            type="button"
            className={bubbleButtonClass(consoleTarget === 'broker', 'sm')}
            onClick={() => toggleTarget('broker')}
            aria-pressed={consoleTarget === 'broker'}
          >
            Broker (Redis)
          </button>
          {workers.map(w => (
            <button
              key={w.worker_id}
              type="button"
              className={bubbleButtonClass(consoleTarget === w.worker_id, 'sm')}
              onClick={() => toggleTarget(w.worker_id)}
              aria-pressed={consoleTarget === w.worker_id}
              title={w.worker_id}
            >
              {w.worker_id.length > 40 ? `${w.worker_id.slice(0, 38)}…` : w.worker_id}
            </button>
          ))}
        </div>

        {!hasToken ? (
          <p className="text-sm text-muted-foreground">
            Select a target above after authenticating to open a live console stream.
          </p>
        ) : consoleTarget === 'none' ? (
          <p className="text-sm text-muted-foreground">
            Select a target above to open a live console stream.
          </p>
        ) : consoleTarget === 'broker' ? (
          <BrokerConsoleView key="broker" />
        ) : (
          <WorkerConsoleView key={consoleTarget} workerId={consoleTarget} isK8s={isK8s} />
        )}
      </CelerySectionCard>
    </div>
  )
}
