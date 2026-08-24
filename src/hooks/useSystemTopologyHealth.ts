import { useMemo } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { fetchMonitorStatus } from '@/api/monitor'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { makeProbeQuery } from '@/hooks/useApiHealthProbes'
import { ALL_SERVICES } from '@/pages/settings/apiHealth/apiHealthConfig'
import type { StatusResponse } from '@/types/monitor'
import {
  computeAccountSyncLamp,
  computeIbBrokerGroupLamp,
  computeStrategyTradingDaemonLamp,
  type DaemonLamp,
} from '@/utils/daemonLamps'
import { ingestRedisHealthLamp, type IngestLamp } from '@/utils/socketIngestLamp'
import {
  TOPOLOGY_NODE_REGISTRY,
  type TopologyLamp,
  type TopologyNodeHealth,
} from '@/components/topology/topologyRegistry'

type SocketIngestKey = 'ib_ingestor' | 'ib_account_agent' | 'ib_operator' | 'polygon_ws'

function topologySocketToIngestKey(key: string): SocketIngestKey | null {
  if (key === 'polygon_ws') return 'polygon_ws'
  if (key === 'ib_ingestor' || key === 'ib_account_agent' || key === 'ib_operator') {
    return key
  }
  return null
}

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
  const lamp = computeStrategyTradingDaemonLamp(hb, ibGroup.lamp)
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

  const status = monitorQuery.data

  const nodes: TopologyNodeHealth[] = useMemo(() => {
    return TOPOLOGY_NODE_REGISTRY.map(def => {
      const base: TopologyNodeHealth = {
        key: def.key,
        name: def.name,
        kind: def.kind,
        lamp: 'yellow',
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
        const ingestKey = topologySocketToIngestKey(def.key)
        if (!ingestKey) return base
        const health = buildSocketNode(ingestKey, status)
        return { ...base, ...health }
      }

      if (def.key === 'daemon_trading') {
        return { ...base, ...buildDaemonTradingNode(status) }
      }

      if (def.key === 'account_sync') {
        return { ...base, ...buildAccountSyncNode(status) }
      }

      return base
    })
  }, [probeResults, status])

  const alertCount = nodes.filter(n => n.lamp === 'red').length
  const isLoading =
    enabled &&
    (monitorQuery.isLoading || probeResults.some(r => r.isLoading))

  return {
    nodes,
    alertCount,
    isLoading,
    refetch: () => {
      void monitorQuery.refetch()
      probeResults.forEach(r => {
        void r.refetch()
      })
    },
  }
}
