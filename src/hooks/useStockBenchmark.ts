import { useQuery } from '@tanstack/react-query'
import { fetchBenchmarks } from '@/api/market'
import { QUERY_KEYS } from '@/constants/queryKeys'

export function useStockBenchmark(symbol: string, enabled: boolean) {
  const sym = symbol.trim().toUpperCase()
  return useQuery({
    queryKey: QUERY_KEYS.market.benchmark(sym),
    queryFn: async () => {
      const res = await fetchBenchmarks([sym])
      return res.benchmarks[sym]?.close ?? null
    },
    enabled: enabled && !!sym,
    staleTime: 60_000,
    retry: 0,
  })
}
