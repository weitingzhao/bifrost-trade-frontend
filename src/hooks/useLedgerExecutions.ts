import { useQuery } from '@tanstack/react-query'
import { fetchExecutionsRange } from '@/api/trading'
import { QUERY_KEYS } from '@/constants/queryKeys'
import type { ExecutionsRangeParams } from '@/types/trading'

export function useLedgerExecutions(
  params: ExecutionsRangeParams & { enabled?: boolean },
) {
  const { enabled = true, ...fetchParams } = params
  return useQuery({
    queryKey: [...QUERY_KEYS.trading.executions, 'ledger', fetchParams],
    queryFn: () => fetchExecutionsRange(fetchParams),
    enabled,
    staleTime: 30_000,
  })
}

/**
 * TWS fills Flex has not confirmed yet (`source_scope=on_the_fly`, core 0.61.0). The Ledger adds
 * them to the open option positions so its net quantity follows IB intraday; see
 * `utils/ledger/pendingFills` for the rule it applies again on the client.
 */
export function useLedgerExecutionsPending(
  params: Omit<ExecutionsRangeParams, 'source_scope'> & { enabled?: boolean },
) {
  const { enabled = true, ...rest } = params
  return useQuery({
    queryKey: [...QUERY_KEYS.trading.executions, 'ledger-pending', rest],
    queryFn: () => fetchExecutionsRange({ ...rest, source_scope: 'on_the_fly' }),
    enabled,
    staleTime: 30_000,
  })
}

export function useLedgerExecutionsBook(
  params: Omit<ExecutionsRangeParams, 'source_scope'> & { enabled?: boolean },
) {
  const { enabled = true, ...rest } = params
  return useQuery({
    queryKey: [...QUERY_KEYS.trading.executionsBook, 'ledger', rest],
    queryFn: () =>
      fetchExecutionsRange({ ...rest, source_scope: 'performance_book' }),
    enabled,
    staleTime: 30_000,
  })
}
