import { useEffect } from 'react'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { fetchQuotes, subscribeQuotes } from '@/api/market'
import type { QuoteItem } from '@/types/market'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { mergeQuotesIntoSymbolMap } from '@/utils/marketStreamsRows'

const FALLBACK_POLL_MS = 8_000

/** Single-quote merge for SSE; uses same symbol-key rules as Legacy mergeQuotesIntoSymbolMap. */
export function mergeQuoteIntoMap(
  prev: Record<string, QuoteItem>,
  q: QuoteItem,
): Record<string, QuoteItem> {
  return mergeQuotesIntoSymbolMap(prev, [q])
}

/**
 * SSE-powered quote stream with initial snapshot + optional fallback poll.
 *
 * Bug fix (P0): previously read quotesMap via `getQueryData()` which does NOT
 * subscribe to cache updates, so SSE-pushed `setQueryData` calls never caused
 * a re-render. Now we subscribe via `useQuery({ queryKey: QUOTES_KEY })` so
 * every `setQueryData` on this key triggers a re-render in all consumers.
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

  // Snapshot fetch — writes merged result into the shared QUOTES_KEY cache.
  const snapshotQuery = useQuery({
    queryKey: [...QUERY_KEYS.market.quotesSnapshot, symbolsKey, contractKeysKey],
    queryFn: async () => {
      const resp = await fetchQuotes(symbols, contractKeys)
      queryClient.setQueryData<Record<string, QuoteItem>>(QUERY_KEYS.market.quotesLive, (prev) =>
        mergeQuotesIntoSymbolMap(prev ?? {}, resp.quotes),
      )
      return resp
    },
    refetchInterval: enableFallbackPoll ? FALLBACK_POLL_MS : false,
    // Empty symbol list → Market API builds focus list from positions + watchlist (Legacy behavior).
    enabled: enableFallbackPoll || enableSse,
    staleTime: FALLBACK_POLL_MS,
  })

  // Subscribe to the shared quotes map.
  // Using useQuery here (not getQueryData) means this component re-renders
  // whenever setQueryData(QUOTES_KEY, ...) is called — including from SSE events.
  const { data: quotesMap = {} } = useQuery<Record<string, QuoteItem>>({
    queryKey: QUERY_KEYS.market.quotesLive,
    queryFn: () => ({}),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  // SSE subscription — pushes individual quote updates into the shared cache.
  useEffect(() => {
    if (!enableSse) return
    const unsub = subscribeQuotes((q) => {
      queryClient.setQueryData<Record<string, QuoteItem>>(QUERY_KEYS.market.quotesLive, (prev) =>
        mergeQuoteIntoMap(prev ?? {}, q),
      )
    })
    return unsub
  }, [enableSse, queryClient])

  return {
    quotesMap,
    isLoading: snapshotQuery.isLoading,
    isError: snapshotQuery.isError,
  }
}

/** Read-only reactive consumer: subscribes to the shared quotes cache. */
export function useQuotesMap(): Record<string, QuoteItem> {
  const { data = {} } = useQuery<Record<string, QuoteItem>>({
    queryKey: QUERY_KEYS.market.quotesLive,
    queryFn: () => ({}),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
  return data
}
