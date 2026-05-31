import { useQuery } from '@tanstack/react-query'
import { fetchIvTermStructure, fetchIvVolatilityCone } from '@/api/research/optionDiscovery'
import { QUERY_KEYS } from '@/constants/queryKeys'

export function useIvTermStructure(
  symbol: string,
  expirations: string[],
  enabled = false,
) {
  const sym = symbol.trim().toUpperCase()
  const expKey = expirations.join(',')
  return useQuery({
    queryKey: [...QUERY_KEYS.research.discovery.ivTerm, sym, expKey],
    queryFn: async () => {
      const [term, cone] = await Promise.all([
        fetchIvTermStructure(sym, expirations),
        fetchIvVolatilityCone(sym, expirations),
      ])
      return { term, cone }
    },
    enabled: enabled && sym.length > 0 && expirations.length >= 2,
    staleTime: 120_000,
  })
}
