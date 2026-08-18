import { useQuery, useQueryClient } from '@tanstack/react-query'
import { pluginFlexConfigSummary } from '@/api/flexQueryPlugin'
import { QUERY_KEYS } from '@/constants/queryKeys'

export function useFlexConfigSummary() {
  return useQuery({
    queryKey: QUERY_KEYS.plugin.flexConfigSummary,
    queryFn: pluginFlexConfigSummary,
  })
}

export function useInvalidateFlexConfigSummary() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: QUERY_KEYS.plugin.flexConfigSummary })
}
