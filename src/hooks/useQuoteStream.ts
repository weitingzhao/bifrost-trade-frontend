import { useEffect } from 'react'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { fetchQuotes, subscribeQuotes } from '@/api/market'
import type { QuoteItem } from '@/types/market'

const QUOTES_KEY = ['market', 'quotes-live'] as const
const FALLBACK_POLL_MS = 8_000

function mergeQuoteIntoMap(
  prev: Record<string, QuoteItem>,
  q: QuoteItem,
): Record<string, QuoteItem> {
  const key = q.contract_key ?? q.symbol
  if (!key) return prev
  return { ...prev, [key]: q }
}

/**
 * SSE-powered quote stream with initial snapshot + optional fallback poll.
 * Writes to QueryClient cache so any component can read via the shared key.
 */
export function useQuoteStream(
  symbols: string[],
  contractKeys: string[] = [],
  opts?: { enableSse?: boolean; enableFallbackPoll?: boolean },
) {
  const queryClient = useQueryClient()
  const enableSse = opts?.enableSse ?? true
  const enableFallbackPoll = opts?.enableFallbackPoll ?? true

  const symbolsKey = symbols.join(',')
  const contractKeysKey = contractKeys.join(',')

  const snapshotQuery = useQuery({
    queryKey: [...QUOTES_KEY, 'snapshot', symbolsKey, contractKeysKey],
    queryFn: async () => {
      const resp = await fetchQuotes(symbols, contractKeys)
      const map: Record<string, QuoteItem> = {}
      for (const q of resp.quotes) {
        const key = q.contract_key ?? q.symbol
        if (key) map[key] = q
      }
      queryClient.setQueryData<Record<string, QuoteItem>>(QUOTES_KEY, (prev) => ({
        ...(prev ?? {}),
        ...map,
      }))
      return resp
    },
    refetchInterval: enableFallbackPoll ? FALLBACK_POLL_MS : false,
    enabled: symbols.length > 0 || contractKeys.length > 0,
  })

  useEffect(() => {
    if (!enableSse) return

    const unsub = subscribeQuotes((q) => {
      queryClient.setQueryData<Record<string, QuoteItem>>(QUOTES_KEY, (prev) =>
        mergeQuoteIntoMap(prev ?? {}, q),
      )
    })

    return unsub
  }, [enableSse, queryClient])

  const quotesMap = queryClient.getQueryData<Record<string, QuoteItem>>(QUOTES_KEY) ?? {}

  return {
    quotesMap,
    isLoading: snapshotQuery.isLoading,
    isError: snapshotQuery.isError,
  }
}

/** Read-only consumer: get quote map from cache without starting a new stream. */
export function useQuotesMap(): Record<string, QuoteItem> {
  const queryClient = useQueryClient()
  return queryClient.getQueryData<Record<string, QuoteItem>>(QUOTES_KEY) ?? {}
}

export { QUOTES_KEY }
