import { useQuery } from '@tanstack/react-query'
import { fetchGreeks, fetchGreeksAvailableDates } from '@/api/research'
import { QUERY_KEYS } from '@/constants/queryKeys'

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

export function useGreeksHistory(
  symbol: string,
  tradeDate: string | null,
  expiration?: string,
) {
  const sym = symbol.trim().toUpperCase()
  const expKey = expiration ?? 'all'
  return useQuery({
    queryKey: [...QUERY_KEYS.research.greeks, sym, tradeDate, expKey],
    queryFn: () => fetchGreeks(sym, tradeDate!, expiration),
    enabled: sym.length > 0 && Boolean(tradeDate),
    staleTime: 300_000,
    retry: 0,
  })
}
