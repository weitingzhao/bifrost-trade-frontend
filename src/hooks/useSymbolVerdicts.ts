import { useQuery } from '@tanstack/react-query'
import { fetchSymbolVerdicts, type SymbolVerdicts } from '@/api/research/symbolVerdicts'

/** A verdict produced in chat shows on the hub within one refresh — the query refetches every minute. */
export function useSymbolVerdicts(symbol: string) {
  const sym = (symbol || '').trim().toUpperCase()
  return useQuery<SymbolVerdicts>({
    queryKey: ['symbol-verdicts', sym],
    queryFn: () => fetchSymbolVerdicts(sym),
    enabled: sym.length > 0,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  })
}
