import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { useCeleryHeaderMetrics } from '@/hooks/useCeleryHeaderMetrics'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { makeProbeQuery } from '@/hooks/useApiHealthProbes'
import { ALL_SERVICES } from '@/pages/settings/apiHealth/apiHealthConfig'
import { worstLamp } from '@/pages/settings/apiHealth/apiHealthUi'
import type { Lamp } from '@/pages/settings/apiHealth/apiHealthConfig'
import {
  aggregateDaemonProcessesHealthFromStatus,
  aggregateSocketNavHealthFromStatus,
  type AggregateIngestLamp,
} from '@/utils/socketIngestLamp'
import { runtimeLampText } from '@/utils/celeryRuntime'

export const SYSTEM_NAV_API_PATH = '/settings/api'
export const SYSTEM_NAV_DAEMON_PATH = '/operations/daemon'
export const SYSTEM_NAV_CELERY_PATH = '/operations/celery'
export const SYSTEM_NAV_SOCKET_PATH = '/settings/socket'

const SYSTEM_NAV_PATHS = new Set([
  SYSTEM_NAV_API_PATH,
  SYSTEM_NAV_DAEMON_PATH,
  SYSTEM_NAV_CELERY_PATH,
  SYSTEM_NAV_SOCKET_PATH,
])

export function isSystemNavPath(path: string): boolean {
  return SYSTEM_NAV_PATHS.has(path)
}

export type SystemNavLampState = { lamp: string; title: string }

function ingestLampForIcon(lamp: AggregateIngestLamp): string {
  return lamp === 'none' ? 'gray' : lamp
}

function computeApiNavLamp(
  probeResults: { isPending: boolean; isError: boolean }[],
): SystemNavLampState {
  if (probeResults.length === 0) {
    return { lamp: 'gray', title: 'API health probes not configured.' }
  }
  if (probeResults.every(r => r.isPending)) {
    return { lamp: 'gray', title: 'Checking FastAPI health…' }
  }
  const lamps: Lamp[] = probeResults.map(r =>
    r.isPending ? 'yellow' : r.isError ? 'red' : 'green',
  )
  const lamp = worstLamp(lamps)
  const failed = ALL_SERVICES.filter((_, i) => probeResults[i]?.isError).map(s => s.name)
  const title =
    lamp === 'green'
      ? 'All configured APIs responded OK on /health.'
      : failed.length > 0
        ? `Unreachable: ${failed.join(', ')}`
        : 'Some API probes still in progress.'
  return { lamp, title }
}

export function useSystemNavLamps(enabled = true) {
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

  const monitorQuery = useMonitorStatus()
  const celery = useCeleryHeaderMetrics(enabled)

  const status = enabled ? monitorQuery.data : undefined

  const lamps = useMemo((): Record<string, SystemNavLampState> => {
    const api = computeApiNavLamp(probeResults)
    const daemonRollup = aggregateDaemonProcessesHealthFromStatus(status)
    const socketRollup = aggregateSocketNavHealthFromStatus(status)

    return {
      [SYSTEM_NAV_API_PATH]: api,
      [SYSTEM_NAV_DAEMON_PATH]: {
        lamp: ingestLampForIcon(daemonRollup.lamp),
        title: daemonRollup.title,
      },
      [SYSTEM_NAV_CELERY_PATH]: {
        lamp: celery.lamp === 'none' ? 'gray' : celery.lamp,
        title: `${runtimeLampText(celery.lamp)} — ${celery.title}`,
      },
      [SYSTEM_NAV_SOCKET_PATH]: {
        lamp: ingestLampForIcon(socketRollup.lamp),
        title: socketRollup.title,
      },
    }
  }, [probeResults, status, celery.lamp, celery.title])

  return { lamps, getLamp: (path: string) => lamps[path] }
}
