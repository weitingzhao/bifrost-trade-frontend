import { useQuery } from '@tanstack/react-query'
import {
  fetchCoverageDbSummary,
  fetchCoverageInventory,
  fetchCoverageQuality,
  fetchCoverageWatchlist,
} from '@/api/marketDataCoverage'

/** The plugin recomputes these on a nightly cadence; polling adds nothing. */
const SHARED = { staleTime: 5 * 60_000, refetchOnWindowFocus: false } as const

export function useCoverageInventory() {
  return useQuery({ queryKey: ['coverage', 'inventory'], queryFn: ({ signal }) => fetchCoverageInventory(signal), ...SHARED })
}
export function useCoverageQuality() {
  return useQuery({ queryKey: ['coverage', 'quality'], queryFn: ({ signal }) => fetchCoverageQuality(signal), ...SHARED })
}
export function useCoverageWatchlist() {
  return useQuery({ queryKey: ['coverage', 'watchlist'], queryFn: ({ signal }) => fetchCoverageWatchlist(signal), ...SHARED })
}
export function useCoverageDbSummary() {
  return useQuery({ queryKey: ['coverage', 'db-summary'], queryFn: ({ signal }) => fetchCoverageDbSummary(signal), ...SHARED })
}
