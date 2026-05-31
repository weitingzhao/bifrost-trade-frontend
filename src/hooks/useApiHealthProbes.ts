import { useQueries, useQuery } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/constants/queryKeys'

export interface ApiServiceDef {
  key: string
  label?: string
  name?: string
  base: string
  healthPath: string
}

export interface ProbeResult {
  ms: number
  body: Record<string, unknown> | null
}

export interface MassiveStatus {
  configured?: boolean
  [key: string]: unknown
}

function safeBody(raw: unknown): Record<string, unknown> | null {
  if (raw != null && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>
  }
  return null
}

export function makeProbeQuery(svc: ApiServiceDef) {
  return {
    queryKey: [...QUERY_KEYS.settings.apiHealth, svc.key] as const,
    queryFn: async (): Promise<ProbeResult> => {
      const start = performance.now()
      const res = await fetch(`${svc.base}${svc.healthPath}`, {
        signal: AbortSignal.timeout(10_000),
      })
      const ms = Math.round(performance.now() - start)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const raw: unknown = await res.json().catch(() => null)
      return { ms, body: safeBody(raw) }
    },
    refetchInterval: 20_000,
    retry: 1,
  } as const
}

export function useApiHealthProbe(svc: ApiServiceDef) {
  return useQuery(makeProbeQuery(svc))
}

export function useApiHealthProbes(services: ApiServiceDef[]) {
  return useQueries({
    queries: services.map(svc => makeProbeQuery(svc)),
  })
}

export function useMassiveApiStatus(massiveBase: string) {
  return useQuery({
    queryKey: QUERY_KEYS.settings.apiHealthMassive,
    queryFn: async (): Promise<MassiveStatus> => {
      const res = await fetch(`${massiveBase}/research/massive/status`, {
        signal: AbortSignal.timeout(10_000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json() as Promise<MassiveStatus>
    },
    refetchInterval: 30_000,
    retry: 1,
  })
}
