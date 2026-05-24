import { useQuery } from '@tanstack/react-query'
import { fetchBenchmarks } from '@/api/market'

export function useBenchmarks(symbols: string[]) {
  return useQuery({
    queryKey: ['market', 'benchmarks', symbols],
    queryFn: () => fetchBenchmarks(symbols),
    staleTime: 60_000,
    enabled: symbols.length > 0,
  })
}
