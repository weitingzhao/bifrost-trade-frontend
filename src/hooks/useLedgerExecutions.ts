import { useQuery } from '@tanstack/react-query'
import { fetchExecutionsRange } from '@/api/trading'
import type { ExecutionsRangeParams } from '@/types/trading'

export function useLedgerExecutions(
  params: ExecutionsRangeParams & { enabled?: boolean },
) {
  const { enabled = true, ...fetchParams } = params
  return useQuery({
    queryKey: ['trading', 'executions', 'ledger', fetchParams],
    queryFn: () => fetchExecutionsRange(fetchParams),
    enabled,
    staleTime: 30_000,
  })
}

export function useLedgerExecutionsBook(
  params: Omit<ExecutionsRangeParams, 'source_scope'> & { enabled?: boolean },
) {
  const { enabled = true, ...rest } = params
  return useQuery({
    queryKey: ['trading', 'executions', 'ledger-book', rest],
    queryFn: () =>
      fetchExecutionsRange({ ...rest, source_scope: 'performance_book' }),
    enabled,
    staleTime: 30_000,
  })
}
