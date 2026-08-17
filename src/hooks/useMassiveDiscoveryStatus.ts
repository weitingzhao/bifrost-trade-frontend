import { useQuery } from '@tanstack/react-query'
import { fetchMarketDataPluginStatus } from '@/api/research/optionDiscovery'
import { QUERY_KEYS } from '@/constants/queryKeys'
import type { MassiveDailyChecklistDims } from '@/types/optionDiscovery'

/** Plugin health stand-in for Discovery status strip. */
export function useMassiveDiscoveryStatus() {
  return useQuery({
    queryKey: QUERY_KEYS.research.discovery.massiveStatus,
    queryFn: fetchMarketDataPluginStatus,
    staleTime: 120_000,
  })
}

/** Daily checklist Trade API was retired with api-massive — always empty. */
export function useMassiveDailyChecklist(symbol: string, configured: boolean | undefined) {
  const sym = symbol.trim().toUpperCase()
  return useQuery({
    queryKey: [...QUERY_KEYS.research.discovery.dailyChecklist, sym, 'retired'],
    queryFn: async (): Promise<{
      ok: boolean
      trade_date?: string
      symbols?: Record<string, MassiveDailyChecklistDims>
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
