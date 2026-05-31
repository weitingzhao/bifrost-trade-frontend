import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { useBenchmarks } from '@/hooks/useBenchmarks'
import { useQuoteStream, useQuotesMap } from '@/hooks/useQuoteStream'
import { buildStreamStripModel, buildStripSymbolList } from '@/utils/streamStripSummary'
import type { StreamStripModel } from '@/utils/streamStripSummary'

const LIVE_PATH = '/market/live'

export interface UseGlobalMarketStripResult {
  model: StreamStripModel | null
  isLoading: boolean
  symbolCount: number
}

/**
 * Data for GlobalMarketStatusBar. When enabled=false, skips quote SSE/poll.
 * On /market/live, reads shared quote cache only (Live page owns the stream).
 */
export function useGlobalMarketStrip(enabled: boolean): UseGlobalMarketStripResult {
  const { pathname } = useLocation()
  const isLivePage = pathname === LIVE_PATH

  const { data: status, isLoading: statusLoading } = useMonitorStatus()

  const subscribedSymbols = useMemo(
    () => (enabled ? [...new Set(status?.live_ui?.subscribed_tickers ?? [])] : []),
    [enabled, status?.live_ui?.subscribed_tickers],
  )

  const cachedQuotes = useQuotesMap()

  const streamHook = useQuoteStream(
    enabled && !isLivePage ? subscribedSymbols : [],
    [],
    {
      enableSse: enabled && !isLivePage,
      enableFallbackPoll: enabled && !isLivePage,
    },
  )

  const quotesMap = useMemo(
    () => (enabled ? (isLivePage ? cachedQuotes : streamHook.quotesMap) : {}),
    [enabled, isLivePage, cachedQuotes, streamHook.quotesMap],
  )

  const watchlistSymbols = useMemo(
    () => (enabled ? buildStripSymbolList(status, quotesMap) : []),
    [enabled, status, quotesMap],
  )

  const benchmarkSymbols = useMemo(() => {
    if (!enabled) return []
    const refs = status?.live_ui?.reference_indices?.map(r => r.symbol).filter(Boolean) ?? []
    return [...new Set([...watchlistSymbols, ...refs])]
  }, [enabled, watchlistSymbols, status?.live_ui?.reference_indices])

  const { data: benchmarkData, isLoading: benchmarksLoading } = useBenchmarks(benchmarkSymbols)

  const model = useMemo(() => {
    if (!enabled) return null
    return buildStreamStripModel(status, quotesMap, benchmarkData?.benchmarks)
  }, [enabled, status, quotesMap, benchmarkData?.benchmarks])

  const isLoading =
    enabled &&
    (statusLoading ||
      (!isLivePage && subscribedSymbols.length > 0 && streamHook.isLoading) ||
      (benchmarkSymbols.length > 0 && benchmarksLoading))

  return {
    model,
    isLoading,
    symbolCount: watchlistSymbols.length,
  }
}
