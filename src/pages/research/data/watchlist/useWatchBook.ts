/**
 * The three readings the design's Watchlist needs and the page did not fetch.
 *
 * All three are joins onto names the page already has, so they hang off the
 * item list rather than being fetched per row by the table:
 *
 * - **the day's move** — one `/market/bars/benchmark` call for every name at
 *   once, which is also where the `is_today` question is answered (the shared
 *   `resolveDailyBasePrice` decides which of the benchmark's two closes is the
 *   base, so this page does not invent a second rule);
 * - **IV rank** — `/market/analytics/iv-percentile` has no bulk form (a
 *   comma-separated `symbol` answers *No iv-percentile rows*), so this is the
 *   existing pooled fetch the IV Radar uses, four at a time;
 * - **the thesis** — the hypothesis board, which is where a watch's reason
 *   actually lives. The Book's census counts the same join; this reads it.
 */
import { useQuery } from '@tanstack/react-query'
import { useBenchmarks } from '@/hooks/useBenchmarks'
import { useHypothesisList } from '@/hooks/useHypotheses'
import { fetchIvPercentileForSymbols } from '@/api/research/ivRadar'
import type { IvPercentileRow } from '@/types/ivRadar'

/** Four at a time — the IV Radar's own pool size, for the same endpoint. */
const IV_CONCURRENCY = 4

const EMPTY_IV: ReadonlyMap<string, IvPercentileRow | null> = new Map()

export function useWatchBook(symbols: readonly string[]) {
  const key = [...symbols].sort().join(',')
  const benchmarks = useBenchmarks([...symbols])
  const hypotheses = useHypothesisList({ limit: 200 })
  const iv = useQuery({
    queryKey: ['market', 'watchlist', 'iv-rank', key],
    queryFn: () => fetchIvPercentileForSymbols(symbols, IV_CONCURRENCY),
    enabled: symbols.length > 0,
    // A rank moves once a day; refetching it while the reader scrolls buys
    // nothing and costs one request per name.
    staleTime: 10 * 60_000,
  })

  return {
    benchmarks: benchmarks.data?.benchmarks ?? {},
    hypotheses: hypotheses.data?.rows ?? [],
    ivBySymbol: iv.data ?? EMPTY_IV,
    /** True while the joins are still arriving; the names are already there. */
    isJoining: benchmarks.isLoading || hypotheses.isLoading || iv.isLoading,
    /**
     * The IV join on its own.
     *
     * `isJoining` gates the whole empty state, so once one name has a row the
     * IV column started saying "no IV percentile row for this name yet" about
     * requests still in flight — a claim, in a cell that is a dash either way.
     */
    ivLoading: iv.isLoading,
    thesisUnavailable: hypotheses.isError,
  }
}
