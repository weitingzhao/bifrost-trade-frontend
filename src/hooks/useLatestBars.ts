/**
 * The latest daily bar per symbol — the dated close the spot resolver puts
 * between a live quote and the broker's mark. One small query per symbol,
 * cached for five minutes: a close changes once a day, and the page has two
 * dozen symbols at most.
 */
import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { fetchBars } from '@/api/market'
import type { LatestBar } from '@/utils/spotPrice'

const STALE_MS = 5 * 60_000

export function useLatestBars(symbols: readonly string[]): Record<string, LatestBar> {
  const results = useQueries({
    queries: symbols.map((symbol) => ({
      queryKey: ['market', 'bars', 'latest', symbol],
      queryFn: () => fetchBars(symbol, '1 D', 2),
      staleTime: STALE_MS,
      enabled: Boolean(symbol),
    })),
  })
  // Keyed off the data identity of each result, so a re-render with the same
  // bars hands back the same object and nothing downstream recomputes.
  const stamp = results.map((r) => r.dataUpdatedAt).join(',')
  const symbolKey = symbols.join(',')
  return useMemo(() => {
    const out: Record<string, LatestBar> = {}
    results.forEach((r, i) => {
      const bars = r.data?.bars ?? []
      if (bars.length === 0) return
      // Newest last or newest first — sort by time rather than trust the order.
      const sorted = [...bars].sort((a, b) => Number(a.time) - Number(b.time))
      const latest = sorted[sorted.length - 1]
      const prev = sorted.length > 1 ? sorted[sorted.length - 2] : null
      const close = Number(latest.close)
      const date = Number(latest.time)
      if (!Number.isFinite(close) || close <= 0 || !Number.isFinite(date)) return
      out[symbols[i].toUpperCase()] = {
        close,
        prevClose: prev && Number.isFinite(Number(prev.close)) ? Number(prev.close) : null,
        date,
      }
    })
    return out
    // results is a fresh array each render; stamp tracks its data, so it is the honest dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stamp, symbolKey])
}
