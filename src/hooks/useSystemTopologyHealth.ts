import { useMemo } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { fetchMonitorStatus } from '@/api/monitor'
import { fetchOpsQueuesSummary, fetchOpsWorkers, fetchWorkerInstances, fetchWorkerProfiles } from '@/api/ops'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { makeProbeQuery } from '@/hooks/useApiHealthProbes'
import { ALL_SERVICES } from '@/pages/settings/apiHealth/apiHealthConfig'
import type { StatusResponse } from '@/types/monitor'
import type { QueueSummaryRow, WorkerProfileInfo } from '@/types/ops'
import {
  computeAccountSyncLamp,
  computeIbBrokerGroupLamp,
  computeStrategyTradingDaemonLamp,
  type DaemonLamp,
} from '@/utils/daemonLamps'
import { ingestRedisHealthLamp, type IngestLamp } from '@/utils/socketIngestLamp'
import {
  celeryQueueFromNodeKey,
  CELERY_BEAT_NODE_KEY,
  CELERY_BROKER_NODE_KEY,
  TOPOLOGY_NODE_REGISTRY,
  type TopologyLamp,
  type TopologyNodeHealth,
} from '@/components/topology/topologyRegistry'
import {
  celeryBeatAgentHealth,
  celeryBrokerHealth,
  celeryQueueDisplayName,
  celeryQueueHealth,
} from '@/components/topology/topologyCeleryHealth'

type SocketIngestKey = 'ib_ingestor' | 'ib_account_agent' | 'ib_operator' | 'massive_ws'

function ingestToTopologyLamp(lamp: IngestLamp): TopologyLamp {
  if (lamp === 'green') return 'green'
  if (lamp === 'red') return 'red'
  return 'yellow'
}

function daemonToTopologyLamp(lamp: DaemonLamp): TopologyLamp {
  if (lamp === 'green') return 'green'
  if (lamp === 'red') return 'red'
  if (lamp === 'yellow') return 'yellow'
  return 'yellow'
}

function truncateSubtitle(text: string, max = 52): string {
  const t = text.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

function buildSocketNode(
  key: SocketIngestKey,
  status: StatusResponse | null | undefined,
): Pick<TopologyNodeHealth, 'lamp' | 'subtitle'> {
  const { lamp, title } = ingestRedisHealthLamp(key, status)
  return {
    lamp: ingestToTopologyLamp(lamp),
    subtitle: truncateSubtitle(title.split('.')[0] ?? title),
  }
}

function buildDaemonTradingNode(status: StatusResponse | null | undefined): Pick<TopologyNodeHealth, 'lamp' | 'subtitle'> {
  const hb = status?.daemon?.heartbeat
  const ibGroup = computeIbBrokerGroupLamp(status, hb)
  const suspended = Boolean(status?.daemon?.trading?.trading_suspended)
  const lamp = computeStrategyTradingDaemonLamp(hb, ibGroup.lamp, suspended)
  const state = status?.daemon?.trading?.auto_status?.daemon_state?.trim()
  const subtitle = state && state.length > 0 ? state : hb?.daemon_alive ? 'Running' : 'Not running'
  return { lamp: daemonToTopologyLamp(lamp), subtitle }
}

function buildAccountSyncNode(status: StatusResponse | null | undefined): Pick<TopologyNodeHealth, 'lamp' | 'subtitle'> {
  const sync = computeAccountSyncLamp(status)
  const alive = status?.account_sync_daemon?.heartbeat?.daemon_alive
  const subtitle = alive ? 'Heartbeat OK' : 'Stale or stopped'
  return { lamp: daemonToTopologyLamp(sync.lamp), subtitle: truncateSubtitle(sync.title.split('.')[0] ?? subtitle) }
}

function queueRowByName(rows: QueueSummaryRow[], name: string): QueueSummaryRow | undefined {
  return rows.find(r => r.name === name)
}

function profileForQueue(profiles: WorkerProfileInfo[], queueName: string): WorkerProfileInfo | undefined {
  return profiles.find(p => p.queues?.includes(queueName) || p.key === queueName)
}

export function useSystemTopologyHealth(enabled: boolean) {
  const probeResults = useQueries({
    queries: ALL_SERVICES.map(svc => {
      const base = makeProbeQuery(svc)
      return {
        queryKey: base.queryKey,
        queryFn: base.queryFn,
        retry: base.retry,
        enabled,
        refetchInterval: enabled ? 20_000 : (false as const),
      }
    }),
  })

  const monitorQuery = useQuery({
    queryKey: QUERY_KEYS.monitor.status,
    queryFn: fetchMonitorStatus,
    enabled,
    refetchInterval: enabled ? 5_000 : (false as const),
  })

  const workersQuery = useQuery({
    queryKey: QUERY_KEYS.ops.workers,
    queryFn: fetchOpsWorkers,
    enabled,
    refetchInterval: enabled ? 10_000 : (false as const),
  })

  const queuesQuery = useQuery({
    queryKey: QUERY_KEYS.ops.queuesSummary,
    queryFn: fetchOpsQueuesSummary,
    enabled,
    refetchInterval: enabled ? 10_000 : (false as const),
  })

  const instancesQuery = useQuery({
    queryKey: QUERY_KEYS.ops.workerInstances,
    queryFn: fetchWorkerInstances,
    enabled,
    refetchInterval: enabled ? 15_000 : (false as const),
  })

  const profilesQuery = useQuery({
    queryKey: QUERY_KEYS.ops.workerProfiles,
    queryFn: fetchWorkerProfiles,
    enabled,
    staleTime: 60_000,
  })

  const status = monitorQuery.data
  const workers = workersQuery.data?.workers
  const brokerConnected = workersQuery.data?.broker.connected === true
  const queueRows = queuesQuery.data?.queues
  const instances = instancesQuery.data?.instances
  const profiles = profilesQuery.data?.profiles

  const nodes: TopologyNodeHealth[] = useMemo(() => {
    const workerList = workers ?? []
    const queueList = queueRows ?? []
    const instanceList = instances ?? []
    const profileList = profiles ?? []
    return TOPOLOGY_NODE_REGISTRY.map(def => {
      const base: TopologyNodeHealth = {
        key: def.key,
        name: def.name,
        kind: def.kind,
        lamp: 'yellow',
        celeryQueue: def.celeryQueue,
        zoneId: def.zoneId,
      }

      if (def.kind === 'api') {
        const svcIndex = ALL_SERVICES.findIndex(s => s.key === def.key)
        const svc = ALL_SERVICES[svcIndex]
        const r = probeResults[svcIndex]
        if (!svc || !r) return base
        const lamp: TopologyLamp = r.isPending ? 'yellow' : r.isError ? 'red' : 'green'
        const rawProfile = r.isSuccess ? r.data.body?.config_profile : undefined
        const profile: 'dev' | 'prod' | undefined =
          rawProfile === 'dev' || rawProfile === 'prod' ? rawProfile : undefined
        return {
          ...base,
          port: svc.port,
          lamp,
          ms: r.isSuccess ? r.data.ms : undefined,
          profile,
        }
      }

      if (def.kind === 'socket') {
        const socketKey = def.key as SocketIngestKey
        const health = buildSocketNode(socketKey, status)
        return { ...base, ...health }
      }

      if (def.key === 'daemon_trading') {
        return { ...base, ...buildDaemonTradingNode(status) }
      }

      if (def.key === 'account_sync') {
        return { ...base, ...buildAccountSyncNode(status) }
      }

      if (def.key === CELERY_BEAT_NODE_KEY) {
        const health = celeryBeatAgentHealth(instanceList)
        return { ...base, ...health, subtitle: truncateSubtitle(health.subtitle) }
      }

      if (def.key === CELERY_BROKER_NODE_KEY) {
        const health = celeryBrokerHealth(brokerConnected)
        return { ...base, ...health, subtitle: truncateSubtitle(health.subtitle) }
      }

      const queueName = def.celeryQueue ?? celeryQueueFromNodeKey(def.key)
      if (queueName) {
        const row = queueRowByName(queueList, queueName)
        const profile = profileForQueue(profileList, queueName)
        const health = celeryQueueHealth(queueName, brokerConnected, workerList, row, profile)
        return {
          ...base,
          name: celeryQueueDisplayName(queueName, row),
          celeryQueue: queueName,
          lamp: health.lamp,
          subtitle: truncateSubtitle(health.subtitle, 56),
        }
      }

      return base
    })
  }, [probeResults, status, workers, brokerConnected, queueRows, instances, profiles])

  const alertCount = nodes.filter(n => n.lamp === 'red').length
  const isLoading =
    enabled &&
    (monitorQuery.isLoading ||
      workersQuery.isLoading ||
      probeResults.some(r => r.isLoading))

  return {
    nodes,
    alertCount,
    isLoading,
    refetch: () => {
      void monitorQuery.refetch()
      void workersQuery.refetch()
      void queuesQuery.refetch()
      void instancesQuery.refetch()
      void profilesQuery.refetch()
      probeResults.forEach(r => {
        void r.refetch()
      })
    },
  }
}
