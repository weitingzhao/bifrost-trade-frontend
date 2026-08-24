import { useQuery } from '@tanstack/react-query'
import { fetchMarketDataPluginCeleryBeatSchedule } from '@/api/research'
import { QUERY_KEYS } from '@/constants/queryKeys'

export function useMarketDataPluginCeleryBeat() {
  return useQuery({
    queryKey: QUERY_KEYS.research.celeryBeat,
    queryFn: fetchMarketDataPluginCeleryBeatSchedule,
    staleTime: 120_000,
  })
}
