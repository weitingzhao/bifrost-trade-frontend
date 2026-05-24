import { useQuery } from '@tanstack/react-query'
import { fetchQuotes } from '@/api/market'

export function useQuotes(symbols: string[], contractKeys: string[] = []) {
  return useQuery({
    queryKey: ['market', 'quotes', symbols, contractKeys],
    queryFn: () => fetchQuotes(symbols, contractKeys),
    refetchInterval: 8_000,
    enabled: symbols.length > 0 || contractKeys.length > 0,
  })
}
