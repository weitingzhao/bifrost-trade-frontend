import { useQuery } from '@tanstack/react-query'
import { fetchMaxPainCompute } from '@/api/research/optionDiscovery'
import { QUERY_KEYS } from '@/constants/queryKeys'

export function useMaxPain(symbol: string, expiration: string, enabled = true) {
  const sym = symbol.trim().toUpperCase()
  const exp = expiration.trim()
  return useQuery({
    queryKey: [...QUERY_KEYS.research.discovery.maxPain, sym, exp],
    queryFn: () => fetchMaxPainCompute({ symbol: sym, expiry: exp }),
    enabled: enabled && sym.length > 0 && exp.length > 0,
    staleTime: 120_000,
  })
}
