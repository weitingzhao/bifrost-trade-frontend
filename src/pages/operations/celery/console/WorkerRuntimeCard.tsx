import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusLamp } from '@/components/StatusLamp'
import { cn } from '@/lib/utils'
import { OpsHostEnvPill } from '@/pages/settings/socket/OpsHostEnvPill'
import { opsHostEnvFromConfigProfile } from '@/utils/ingestOpsShared'
import {
  workerHostFromWorkerId,
  workerLamp,
  workerStatusLabel,
} from '@/utils/celeryWorkerDisplay'
import type { WorkerSummary } from '@/types/ops'
import { WorkerHeartbeatLine } from './WorkerHeartbeatLine'

export interface WorkerRuntimeCardProps {
  worker: WorkerSummary
  selected: boolean
  onSelect: () => void
  onRemove: () => void
  removeDisabled?: boolean
}

export function WorkerRuntimeCard({
  worker,
  selected,
  onSelect,
  onRemove,
  removeDisabled,
}: WorkerRuntimeCardProps) {
  const lamp = workerLamp(worker.status)
  const pill = opsHostEnvFromConfigProfile(worker.worker_config_profile ?? null)
  const host = workerHostFromWorkerId(worker.worker_id)

  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        'rounded-lg border bg-card p-3 text-xs space-y-2 cursor-pointer transition-colors hover:bg-muted/30',
        selected && 'ring-2 ring-primary/50 border-primary/40',
      )}
      title={`Open console for ${worker.worker_id}`}
      onClick={onSelect}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <StatusLamp lamp={lamp} className="h-2.5 w-2.5 shrink-0" />
          <OpsHostEnvPill
            pill={pill}
            title={
              worker.worker_config_profile
                ? `Worker stack: ${worker.worker_config_profile} (from BIFROST_CONFIG on that process)`
                : 'Worker stack unknown — restart worker after upgrade to publish dev/prod via Redis heartbeat'
            }
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-muted-foreground font-medium">{workerStatusLabel(worker.status)}</span>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-muted-foreground hover:text-destructive"
            disabled={removeDisabled}
            title="Remove: stops the systemd/subprocess unit on the Ops control host for this instance id."
            aria-label={`Remove ${worker.worker_id}`}
            onClick={e => {
              e.stopPropagation()
              onRemove()
            }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="min-w-0">
        <div className="font-mono text-dense-meta truncate" title={worker.worker_id}>
          {worker.worker_id}
        </div>
        {host && (
          <div className="text-muted-foreground text-dense-caption" title="Machine hostname from Celery nodename">
            @{host}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-0.5 text-muted-foreground">
        <span>Queues: {worker.queues.length > 0 ? worker.queues.join(', ') : '—'}</span>
        <span>Concurrency: {worker.concurrency}</span>
        <span>
          Active: {worker.active_tasks} / Reserved: {worker.reserved_tasks}
        </span>
        <WorkerHeartbeatLine epochSec={worker.last_heartbeat} />
      </div>
    </div>
  )
}
