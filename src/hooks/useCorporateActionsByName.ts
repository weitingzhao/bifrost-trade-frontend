/**
 * The corporate-action feed for a set of names — one plugin read per name
 * (the plugin takes no list), under the key Corporate Actions has always used,
 * so the Calendar's Corporate actions layer reads the page's cache rather than
 * asking again (§14.2).
 */
import { useQueries } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { fetchCorporateActions } from '@/api/marketData/corporateActions'

export function useCorporateActionsByName(symbols: readonly string[]) {
  return useQueries({
    queries: symbols.map((symbol) => ({
      queryKey: QUERY_KEYS.plugin.corporateActions(symbol),
      queryFn: () => fetchCorporateActions(symbol),
      enabled: Boolean(symbol),
      staleTime: 60 * 60_000,
    })),
  })
}
