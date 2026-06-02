import { useQuery } from '@tanstack/react-query'
import { fetchSymbolStatements } from '@/api/research'
import { QUERY_KEYS } from '@/constants/queryKeys'

export function useStockStatements(symbol: string, expanded: boolean) {
  const sym = symbol.trim().toUpperCase()
  return useQuery({
    queryKey: QUERY_KEYS.research.statements(sym),
    queryFn: () => fetchSymbolStatements(sym),
    enabled: expanded && !!sym,
    staleTime: 300_000,
    retry: 0,
  })
}
