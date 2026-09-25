/**
 * TanStack Query hooks for VRP (IV-RV Spread) — Wave RS-B-VRP2.
 */
import { useQuery } from '@tanstack/react-query'
import {
  fetchEarningsMoves,
  fetchRvCone,
  fetchVrpExtremes,
  fetchVrpHistory,
  fetchVrpLatest,
  type EarningsMoves,
  type RvCone,
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

export function useRvCone(symbol: string, years = 2) {
  return useQuery<RvCone | null>({
    queryKey: QUERY_KEYS.research.vrp.rvCone(symbol, years),
    queryFn: () => fetchRvCone(symbol, years),
    enabled: Boolean(symbol),
    staleTime: DEFAULT_STALE_MS,
  })
}

export function useEarningsMoves(symbol: string, limit = 8) {
  return useQuery<EarningsMoves | null>({
    queryKey: QUERY_KEYS.research.vrp.earningsMoves(symbol, limit),
    queryFn: () => fetchEarningsMoves(symbol, limit),
    enabled: Boolean(symbol),
    // Prints land a few times a year; the rows move only when a close or an IV revises.
    staleTime: 30 * 60_000,
  })
}
