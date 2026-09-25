/**
 * Last and day change for the Symbol list — quotes for the rows on screen only
 * (Owner 2026-09-25: "只订阅可见行").
 *
 * Two readings, two costs:
 *
 * - **Last** — a snapshot of the visible rows, every 5s, merged under the
 *   shared stream's cache (`useQuotesMap`, read-only) so a name the market
 *   strip or Live already streams shows its newer tick. Not `useQuoteStream`:
 *   that hook trims the shared cache to its own list and would drop the names
 *   the strip asked for (the warning in `useBookLive.ts`).
 * - **Prior close** — the daily bars for every name on the shown lists, one
 *   call a minute. The Movers orders need a change for names scrolled out of
 *   view, and a bar is what the change is measured against anyway. A row with
 *   no live quote reads that bar's own close and change, and says so.
 */
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { fetchQuotes } from '@/api/market'
import { useBenchmarks } from '@/hooks/useBenchmarks'
import { useQuotesMap } from '@/hooks/useQuoteStream'
import { computeDailyChange, resolveDailyBasePrice } from '@/utils/dailyChange'
import { mergeQuotesIntoSymbolMap } from '@/utils/marketStreamsRows'
import type { QuoteItem } from '@/types/market'

export interface DockQuote {
  last: number | null
  chgPct: number | null
  /** Where `last` came from, for the cell's title. */
  from: string
}

function epoch(q: QuoteItem | undefined): number {
  if (!q) return -1
  const t = q.ts ?? q.updated_ts ?? q.timestamp ?? null
  return t == null || !Number.isFinite(t) ? 0 : t
}

function priceOf(q: QuoteItem | undefined): number | null {
  if (!q) return null
  if (q.last != null && q.last > 0) return q.last
  if (q.mid != null && q.mid > 0) return q.mid
  if (q.bid != null && q.ask != null && q.bid > 0 && q.ask > 0) return (q.bid + q.ask) / 2
  return null
}

export function useDockQuotes(visible: readonly string[], all: readonly string[]): (sym: string) => DockQuote {
  const visibleKey = [...visible].sort().join(',')
  const allSorted = useMemo(() => [...new Set(all)].sort(), [all])
  const cached = useQuotesMap()
  const snapshot = useQuery({
    queryKey: ['shell', 'dock', 'quotes', visibleKey],
    queryFn: () => fetchQuotes(visibleKey.split(','), []),
    enabled: visibleKey.length > 0,
    refetchInterval: 5_000,
    staleTime: 4_000,
    refetchOnWindowFocus: false,
    // Scrolling changes the key; keep the last answer on screen meanwhile.
    placeholderData: keepPreviousData,
  })
  const { data: bench } = useBenchmarks(allSorted)

  return useMemo(() => {
    const snap = mergeQuotesIntoSymbolMap({}, snapshot.data?.quotes ?? [])
    const bars = bench?.benchmarks ?? {}
    return (sym: string): DockQuote => {
      const key = sym.toUpperCase()
      const a = cached[key]
      const b = snap[key]
      const q = epoch(a) >= epoch(b) ? (priceOf(a) != null ? a : b) : priceOf(b) != null ? b : a
      const live = priceOf(q)
      const bar = bars[key]
      if (live != null) {
        return {
          last: live,
          chgPct: computeDailyChange(live, resolveDailyBasePrice(null, bar)).dailyPct,
          from: q === a ? 'stream' : 'snapshot',
        }
      }
      if (bar?.close != null) {
        return {
          last: bar.close,
          chgPct: computeDailyChange(bar.close, bar.prev_close ?? null).dailyPct,
          from: bar.bar_time != null ? `close of ${new Date(bar.bar_time * 1000).toISOString().slice(0, 10)}` : 'daily close',
        }
      }
      return { last: null, chgPct: null, from: 'no quote' }
    }
  }, [cached, snapshot.data, bench])
}
