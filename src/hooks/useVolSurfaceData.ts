/**
 * TanStack Query hooks for Vol Surface (SVI) — Wave RS-B-Surface2.
 */
import { useQuery } from '@tanstack/react-query'
import {
  fetchAtmIvTerm,
  type AtmIvTerm,
  fetchIvCone,
  type IvCone,
  fetchResiduals,
  fetchSkewExtremes,
  fetchTermStructure,
  fetchVolSurfaceFit,
  type SkewExtremesResponse,
  type TermStructurePoint,
  type VolSurfaceFitRow,
  type VolSurfaceResidualRow,
} from '@/api/research/volSurface'
import { QUERY_KEYS } from '@/constants/queryKeys'

const STALE_MS = 5 * 60_000

export function useVolSurfaceFit(symbol: string, tradeDate?: string) {
  return useQuery<VolSurfaceFitRow[]>({
    queryKey: QUERY_KEYS.research.volSurface.fit(symbol, tradeDate ?? 'latest'),
    queryFn: () => fetchVolSurfaceFit(symbol, tradeDate),
    enabled: Boolean(symbol),
    staleTime: STALE_MS,
  })
}

export function useTermStructure(symbol: string, tradeDate?: string) {
  return useQuery<TermStructurePoint[]>({
    queryKey: QUERY_KEYS.research.volSurface.termStructure(symbol, tradeDate ?? 'latest'),
    queryFn: () => fetchTermStructure(symbol, tradeDate),
    enabled: Boolean(symbol),
    staleTime: STALE_MS,
  })
}

export function useResiduals(symbol: string, expiry: string, tradeDate?: string) {
  return useQuery<VolSurfaceResidualRow[]>({
    queryKey: QUERY_KEYS.research.volSurface.residuals(
      symbol,
      tradeDate ?? 'latest',
      expiry,
    ),
    queryFn: () => fetchResiduals(symbol, expiry, tradeDate),
    enabled: Boolean(symbol && expiry),
    staleTime: STALE_MS,
  })
}

export function useSkewExtremes(limit = 20) {
  return useQuery<SkewExtremesResponse>({
    queryKey: QUERY_KEYS.research.volSurface.skewExtremes(limit),
    queryFn: () => fetchSkewExtremes(limit),
    staleTime: STALE_MS,
  })
}

/** The repaired ATM IV store's term for the name's latest session (research). */
export function useAtmIvTerm(symbol: string) {
  return useQuery<AtmIvTerm | null>({
    queryKey: QUERY_KEYS.research.volSurface.atmIvTerm(symbol),
    queryFn: () => fetchAtmIvTerm(symbol),
    enabled: Boolean(symbol),
    staleTime: STALE_MS,
  })
}

/** The name's 1y IV cone at 30 / 60 / 90 days (`/research/volatility/iv-cone`). */
export function useIvCone(symbol: string) {
  return useQuery<IvCone | null>({
    queryKey: QUERY_KEYS.research.volSurface.ivCone(symbol),
    queryFn: () => fetchIvCone(symbol),
    enabled: Boolean(symbol),
    staleTime: STALE_MS,
  })
}
