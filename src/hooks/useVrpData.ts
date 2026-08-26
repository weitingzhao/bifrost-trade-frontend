/**
 * TanStack Query hooks for VRP (IV-RV Spread) — Wave RS-B-VRP2.
 */
import { useQuery } from '@tanstack/react-query'
import {
  fetchVrpExtremes,
  fetchVrpHistory,
  fetchVrpLatest,
  type VrpExtremesResponse,
  type VrpRow,
} from '@/api/research/vrp'
import { QUERY_KEYS } from '@/constants/queryKeys'

const DEFAULT_STALE_MS = 5 * 60_000

export function useVrpLatest(symbol: string) {
  return useQuery<VrpRow | null>({
    queryKey: QUERY_KEYS.research.vrp.latest(symbol),
    queryFn: () => fetchVrpLatest(symbol),
    enabled: Boolean(symbol),
    staleTime: DEFAULT_STALE_MS,
  })
}

export function useVrpHistory(symbol: string, days = 252) {
  return useQuery<VrpRow[]>({
    queryKey: QUERY_KEYS.research.vrp.history(symbol, days),
    queryFn: () => fetchVrpHistory(symbol, days),
    enabled: Boolean(symbol),
    staleTime: DEFAULT_STALE_MS,
  })
}

export function useVrpExtremes(bucket: 'high' | 'low', limit = 20) {
  return useQuery<VrpExtremesResponse>({
    queryKey: QUERY_KEYS.research.vrp.extremes(bucket, limit),
    queryFn: () => fetchVrpExtremes(bucket, limit),
    staleTime: DEFAULT_STALE_MS,
  })
}
