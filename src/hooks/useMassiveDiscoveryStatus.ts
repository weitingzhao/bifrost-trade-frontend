import { useQuery } from '@tanstack/react-query'
import { fetchMassiveStatus } from '@/api/massive'
import { fetchMassiveDailyChecklist } from '@/api/research/optionDiscovery'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { nyCalendarDateIso } from '@/utils/optionDiscovery/strikePresets'

export function useMassiveDiscoveryStatus() {
  return useQuery({
    queryKey: QUERY_KEYS.research.discovery.massiveStatus,
    queryFn: fetchMassiveStatus,
    staleTime: 120_000,
  })
}

export function useMassiveDailyChecklist(symbol: string, configured: boolean | undefined) {
  const sym = symbol.trim().toUpperCase()
  const tradeDate = nyCalendarDateIso()
  return useQuery({
    queryKey: [...QUERY_KEYS.research.discovery.dailyChecklist, sym, tradeDate],
    queryFn: () => fetchMassiveDailyChecklist({ symbols: [sym], tradeDate }),
    enabled: Boolean(configured) && sym.length > 0,
    staleTime: 60_000,
  })
}
