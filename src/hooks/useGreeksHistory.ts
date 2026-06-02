import { useMutation, useQuery } from '@tanstack/react-query'
import { fetchGreeks, fetchGreeksAvailableDates } from '@/api/research'
import { QUERY_KEYS } from '@/constants/queryKeys'
import type { FetchGreeksParams } from '@/types/research'

export function useGreeksAvailableDates(symbol: string) {
  const sym = symbol.trim().toUpperCase()
  return useQuery({
    queryKey: [...QUERY_KEYS.research.greeks, 'dates', sym],
    queryFn: () => fetchGreeksAvailableDates(sym),
    enabled: sym.length > 0,
    staleTime: 600_000,
    retry: 0,
  })
}

export function useGreeksLoad() {
  return useMutation({
    mutationKey: [...QUERY_KEYS.research.greeks, 'load'],
    mutationFn: (params: FetchGreeksParams) => fetchGreeks(params),
  })
}
