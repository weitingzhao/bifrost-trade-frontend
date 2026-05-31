import { useMutation } from '@tanstack/react-query'
import { fetchScreenerResults } from '@/api/research'
import { QUERY_KEYS } from '@/constants/queryKeys'
import type { ScreenerFilters } from '@/types/research'

export function useOptionScreener() {
  return useMutation({
    mutationKey: [...QUERY_KEYS.research.screener, 'run'],
    mutationFn: (filters: ScreenerFilters) => fetchScreenerResults(filters),
  })
}
