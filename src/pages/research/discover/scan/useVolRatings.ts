/**
 * What the Vol ratings page reads: the scan, the fitted weights, the rules.
 *
 * Three queries, and the reason each is its own:
 *
 * - **the scan** is asked for at the server's neutral preset and re-weighted
 *   on this side, so moving a slider does not refetch. The universe is sent as
 *   a symbol list rather than filtered after the fact, because the route
 *   answers with at most 500 rows of a 643-name universe — narrowing here
 *   keeps Book and Watch complete instead of showing the part of them that
 *   made the server's top 500.
 * - **the adaptive weights** cannot be written down: `adaptive_30d` is fitted
 *   from 30 days of lens hit rates, so the only way to know them is to ask.
 *   One row is enough to read the `weights` off the envelope, and it answers
 *   in about 40ms.
 * - **the opportunities** are Trade's, not Research's, and they are what the
 *   design's Rule column can honestly say: which active opportunity is
 *   registered on a name.
 */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchScan } from '@/api/research/scan'
import { fetchOpportunities } from '@/api/strategy'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { usePortfolioSymbols, type PortfolioUniverse } from '@/hooks/usePortfolioSymbols'
import { ruleIndex, toVolRow, type VolRow, type VolWeights } from './volRatingsModel'

/** The route's own cap, and the number the page asks for. */
export const SCAN_LIMIT = 500

export function useVolRatings(universe: PortfolioUniverse) {
  const portfolio = usePortfolioSymbols()

  const symbols = useMemo(() => {
    if (universe === 'all') return []
    const holdings = portfolio.holdingsSymbols
    const watch = portfolio.watchlistSymbols
    const picked =
      universe === 'holdings' ? holdings : universe === 'watchlist' ? watch : [...holdings, ...watch]
    return [...new Set(picked.map((s) => s.trim().toUpperCase()).filter(Boolean))].sort()
  }, [universe, portfolio.holdingsSymbols, portfolio.watchlistSymbols])

  const waitingOnUniverse = universe !== 'all' && portfolio.isLoading

  const scan = useQuery({
    queryKey: [...QUERY_KEYS.research.scan, 'vol-ratings', universe, symbols.join(',')],
    queryFn: () =>
      fetchScan({
        symbols: symbols.length ? symbols : undefined,
        preset: 'neutral',
        sortBy: 'composite_score',
        sortDir: 'desc',
        limit: SCAN_LIMIT,
      }),
    enabled: !waitingOnUniverse,
    staleTime: 5 * 60_000,
  })

  const adaptive = useQuery({
    queryKey: [...QUERY_KEYS.research.scan, 'adaptive-weights'],
    queryFn: () => fetchScan({ preset: 'adaptive_30d', limit: 1 }),
    staleTime: 30 * 60_000,
  })

  const opportunities = useQuery({
    queryKey: ['strategy', 'opportunities', 'active'],
    queryFn: () => fetchOpportunities(true),
    staleTime: 10 * 60_000,
  })

  const rows: VolRow[] = useMemo(
    () => (scan.data?.rows ?? []).map(toVolRow).filter((r): r is VolRow => r != null),
    [scan.data],
  )

  const rules = useMemo(
    () => ruleIndex(opportunities.data?.items ?? []),
    [opportunities.data],
  )

  return {
    rows,
    asOf: scan.data?.as_of ?? null,
    /** How many names the scan covers, whether or not they came back. */
    universeSize: scan.data?.universe_size ?? 0,
    /** True when the server had more rows than it would return. */
    capped: (scan.data?.count ?? 0) >= SCAN_LIMIT,
    adaptiveWeights: (adaptive.data?.weights ?? null) as VolWeights | null,
    rules,
    isLoading: waitingOnUniverse || scan.isLoading,
    isError: scan.isError,
    error: scan.error,
    isHolding: portfolio.isHolding,
    isWatchlist: portfolio.isWatchlist,
  }
}
