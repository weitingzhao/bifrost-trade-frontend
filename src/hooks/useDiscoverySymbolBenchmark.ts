import { useQuery } from '@tanstack/react-query'
import { fetchBenchmarks } from '@/api/market'
import { QUERY_KEYS } from '@/constants/queryKeys'

/** Latest daily close for the selected underlying (from benchmarks API). */
export function useDiscoverySymbolBenchmark(symbol: string) {
  const sym = symbol.trim().toUpperCase()
  return useQuery({
    queryKey: [...QUERY_KEYS.market.quotesSnapshot, 'discovery-benchmark', sym],
    queryFn: async () => {
      const { benchmarks } = await fetchBenchmarks([sym])
      const b = benchmarks[sym]
      const close = b?.close != null && Number.isFinite(b.close) ? b.close : null
      return { [sym]: close } as Record<string, number | null>
    },
    enabled: sym.length > 0,
    staleTime: 60_000,
  })
}
