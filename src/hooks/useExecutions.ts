import { useQuery } from '@tanstack/react-query'
import { fetchExecutions } from '@/api/trading'
import { QUERY_KEYS } from '@/constants/queryKeys'

/** Flex + journal: the official performance book. */
export function useExecutionsPerformanceBook() {
  return useQuery({
    queryKey: QUERY_KEYS.trading.executionsByScope('performance_book'),
    queryFn: () => fetchExecutions('performance_book'),
    staleTime: 30_000,
  })
}

/** Every TWS fill as received, quantity unsigned. */
export function useExecutionsTwsRaw() {
  return useQuery({
    queryKey: QUERY_KEYS.trading.executionsByScope('tws_raw'),
    queryFn: () => fetchExecutions('tws_raw'),
    staleTime: 30_000,
  })
}

/** The canonical view: Flex over TWS, plus journal. */
export function useExecutionsAll() {
  return useQuery({
    queryKey: QUERY_KEYS.trading.executionsByScope('all'),
    queryFn: () => fetchExecutions('all'),
    staleTime: 30_000,
  })
}
