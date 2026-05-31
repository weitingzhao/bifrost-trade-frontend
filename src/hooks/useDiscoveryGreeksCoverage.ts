import { useQuery } from '@tanstack/react-query'
import { fetchGreeksCoverage } from '@/api/research/optionDiscovery'
import { QUERY_KEYS } from '@/constants/queryKeys'

export function useDiscoveryGreeksCoverage(
  symbol: string,
  expiration: string,
  snapshotRowCount: number,
) {
  const sym = symbol.trim()
  const exp = expiration.trim()
  return useQuery({
    queryKey: [...QUERY_KEYS.research.discovery.greeksCoverage, sym, exp],
    queryFn: () => fetchGreeksCoverage(sym, exp, 'massive'),
    enabled: sym.length > 0 && snapshotRowCount > 0,
    staleTime: 30_000,
  })
}
