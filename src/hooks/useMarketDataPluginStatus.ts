import { useQuery } from '@tanstack/react-query'
import { fetchMarketDataPluginStatus } from '@/api/research/optionDiscovery'
import { QUERY_KEYS } from '@/constants/queryKeys'
import type { MarketDataPluginDailyChecklistDims } from '@/types/optionDiscovery'

/** Plugin health stand-in for Discovery status strip. */
export function useMarketDataPluginStatus() {
  return useQuery({
    queryKey: QUERY_KEYS.research.discovery.pluginStatus,
    queryFn: fetchMarketDataPluginStatus,
    staleTime: 120_000,
  })
}

/** Daily checklist Trade API was retired with api-massive — always empty. */
export function useMarketDataPluginDailyChecklist(symbol: string, configured: boolean | undefined) {
  const sym = symbol.trim().toUpperCase()
  return useQuery({
    queryKey: [...QUERY_KEYS.research.discovery.dailyChecklist, sym, 'retired'],
    queryFn: async (): Promise<{
      ok: boolean
      trade_date?: string
      symbols?: Record<string, MarketDataPluginDailyChecklistDims>
      error?: string
    }> => ({
      ok: false,
      symbols: {},
      error: 'Daily checklist migrated to Market Data Plugin',
    }),
    enabled: Boolean(configured) && sym.length > 0,
    staleTime: Infinity,
  })
}
