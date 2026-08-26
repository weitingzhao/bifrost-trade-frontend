/**
 * TanStack Query hooks for OpEx Cycle — Wave RS-B-OpEx2.
 */
import { useQuery } from '@tanstack/react-query'
import {
  fetchOpexCurrent,
  fetchOpexHistory,
  fetchOpexPinAnalysis,
  type OpexCurrentResponse,
  type OpexHistoryRow,
  type OpexPinAnalysisResponse,
} from '@/api/research/opexCycle'
import { QUERY_KEYS } from '@/constants/queryKeys'

const STALE_MS = 5 * 60_000

export function useOpexCurrent(symbol: string, tradeDate?: string) {
  return useQuery<OpexCurrentResponse>({
    queryKey: QUERY_KEYS.research.opexCycle.current(symbol, tradeDate ?? 'latest'),
    queryFn: () => fetchOpexCurrent(symbol, tradeDate),
    enabled: Boolean(symbol),
    staleTime: STALE_MS,
  })
}

export function useOpexHistory(symbol: string, cycles = 12) {
  return useQuery<OpexHistoryRow[]>({
    queryKey: QUERY_KEYS.research.opexCycle.history(symbol, cycles),
    queryFn: () => fetchOpexHistory(symbol, cycles),
    enabled: Boolean(symbol),
    staleTime: STALE_MS,
  })
}

export function useOpexPinAnalysis(symbol: string, cycles = 24) {
  return useQuery<OpexPinAnalysisResponse>({
    queryKey: QUERY_KEYS.research.opexCycle.pinAnalysis(symbol, cycles),
    queryFn: () => fetchOpexPinAnalysis(symbol, cycles),
    enabled: Boolean(symbol),
    staleTime: STALE_MS,
  })
}
