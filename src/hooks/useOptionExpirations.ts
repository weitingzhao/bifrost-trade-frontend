import { useQuery } from '@tanstack/react-query'
import { fetchOptionExpirations } from '@/api/research/optionDiscovery'
import { QUERY_KEYS } from '@/constants/queryKeys'

export function useOptionExpirations(symbol: string, enabled = true) {
  const sym = symbol.trim().toUpperCase()
  return useQuery({
    queryKey: [...QUERY_KEYS.research.discovery.expirations, sym],
    queryFn: () => fetchOptionExpirations(sym),
    enabled: enabled && sym.length > 0,
    staleTime: 60_000,
  })
}
