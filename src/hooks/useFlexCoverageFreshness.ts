import { useQuery } from '@tanstack/react-query'
import { pluginFlexCoverageFreshness } from '@/api/flexQueryPlugin'
import { QUERY_KEYS } from '@/constants/queryKeys'

export function useFlexCoverageFreshness() {
  return useQuery({
    queryKey: QUERY_KEYS.plugin.flexCoverageFreshness,
    queryFn: pluginFlexCoverageFreshness,
    refetchInterval: 60_000,
  })
}
