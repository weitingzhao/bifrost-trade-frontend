import { useMemo } from 'react'
import { useLatestBars } from '@/hooks/useLatestBars'
import { useQuotes } from '@/hooks/useQuotes'
import type { StatusResponse } from '@/types/monitor'
import { buildQuoteMap, uniqueSymbols } from '@/utils/positions'
import { repriceAccounts } from '@/utils/spotPrice'

/**
 * The status snapshot with its stock rows priced the Positions way — live, then
 * the dated close, then the broker's mark only if fresher — for pages that read
 * market value off the snapshot's accounts. A row nothing prices keeps no price.
 */
export function usePricedStatus(status: StatusResponse | null | undefined): StatusResponse | null | undefined {
  const accounts = useMemo(() => status?.portfolio?.accounts ?? [], [status])
  const symbols = useMemo(() => uniqueSymbols(accounts), [accounts])
  const { data: quotesData } = useQuotes(symbols, [])
  const bars = useLatestBars(symbols)
  return useMemo(() => {
    if (!status?.portfolio?.accounts) return status
    const priced = repriceAccounts(status.portfolio.accounts, buildQuoteMap(quotesData), bars)
    return { ...status, portfolio: { ...status.portfolio, accounts: priced } }
  }, [status, quotesData, bars])
}
