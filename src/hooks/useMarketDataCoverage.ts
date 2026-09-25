import { useQuery } from '@tanstack/react-query'
import { fetchCoverageQuality } from '@/api/marketDataCoverage'

/** The plugin recomputes its verdict on a nightly cadence; polling adds nothing. */
const SHARED = { staleTime: 5 * 60_000, refetchOnWindowFocus: false } as const

export function useCoverageQuality() {
  return useQuery({ queryKey: ['coverage', 'quality'], queryFn: ({ signal }) => fetchCoverageQuality(signal), ...SHARED })
}
