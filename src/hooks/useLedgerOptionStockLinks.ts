import { useQuery } from '@tanstack/react-query'
import type { Execution } from '@/types/positions'
import type { OptionStockLinkSummary } from '@/types/trading'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { fetchOptionStockLinkMapForExecutions } from '@/utils/ledger/fetchOptionStockLinkMap'

export function useLedgerOptionStockLinks(bookFiltered: Execution[]) {
  const key = bookFiltered.map(e => e.account_executions_id).join(',')
  return useQuery({
    queryKey: [...QUERY_KEYS.trading.optStockLinks, key],
    queryFn: () => fetchOptionStockLinkMapForExecutions(bookFiltered),
    enabled: bookFiltered.length > 0,
    staleTime: 30_000,
    placeholderData: {} as Record<number, OptionStockLinkSummary>,
  })
}
