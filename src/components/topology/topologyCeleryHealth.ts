import type { QueueSummaryRow, SystemdInstance, WorkerProfileInfo, WorkerSummary } from '@/types/ops'
import { formatQueueLabel } from '@/utils/celeryQueueLabels'
import {
  queueCoverageLamp,
  type CeleryRuntimeLamp,
} from '@/utils/celeryRuntime'
import type { TopologyLamp } from './topologyRegistry'

const BEAT_UNIT = 'bifrost-celery-beat.service'

function runtimeToTopology(lamp: CeleryRuntimeLamp): TopologyLamp {
  if (lamp === 'green') return 'green'
  if (lamp === 'red') return 'red'
  return 'yellow'
}

export function celeryBeatAgentHealth(instances: SystemdInstance[]): {
  lamp: TopologyLamp
  subtitle: string
} {
  const beat = instances.find(i => i.unit === BEAT_UNIT || i.unit.endsWith('celery-beat.service'))
  if (!beat) {
    return { lamp: 'yellow', subtitle: 'Beat unit not on host' }
  }
  const active = beat.active === 'active' && beat.sub === 'running'
  if (active) return { lamp: 'green', subtitle: 'Beat scheduling' }
  if (beat.active === 'activating') return { lamp: 'yellow', subtitle: 'Beat starting' }
  return { lamp: 'red', subtitle: `${beat.active}/${beat.sub}` }
}

export function celeryBrokerHealth(brokerConnected: boolean): {
  lamp: TopologyLamp
  subtitle: string
} {
  if (brokerConnected) return { lamp: 'green', subtitle: 'Redis broker' }
  return { lamp: 'red', subtitle: 'Broker down' }
}

export function workersForQueue(workers: WorkerSummary[], queueName: string): WorkerSummary[] {
  return workers.filter(w => (w.queues ?? []).some(q => q === queueName))
}

export function celeryQueueHealth(
  queueName: string,
  brokerConnected: boolean,
  workers: WorkerSummary[],
  queueRow: QueueSummaryRow | undefined,
  profile: WorkerProfileInfo | undefined,
): { lamp: TopologyLamp; subtitle: string } {
  const { lamp } = queueCoverageLamp(queueName, brokerConnected, workers)
  const wc = workersForQueue(workers, queueName).length
  const max = profile?.max_worker_instances
  const workerPart =
    max != null ? `${wc}/${max} worker${max === 1 ? '' : 's'}` : `${wc} worker${wc === 1 ? '' : 's'}`
  const agentKey = profile?.key ?? queueName
  const parts = [`agent ${agentKey}`, workerPart]
  const pending = queueRow?.pending_broker
  if (pending != null && Number.isFinite(pending) && pending > 0) {
    parts.push(`${pending} pending`)
  }
  const running = queueRow?.running_celery
  if (running != null && Number.isFinite(running) && running > 0) {
    parts.push(`${running} active`)
  }
  return {
    lamp: runtimeToTopology(lamp),
    subtitle: parts.join(' · '),
  }
}

export function celeryQueueDisplayName(queueName: string, queueRow?: QueueSummaryRow): string {
  const d = queueRow?.display_name?.trim()
  if (d) return d
  return formatQueueLabel(queueName)
}
