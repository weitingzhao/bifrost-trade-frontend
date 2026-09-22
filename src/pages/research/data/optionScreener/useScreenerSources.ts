/**
 * Step 1 of the design's rail — **where the underlyings come from**.
 *
 * The design's own line puts this page third: *Stock Explorer picks companies,
 * Option Scan picks underlyings with premium, this picks the contracts that
 * fit a structure.* So the symbol box is not where a screen starts; the list
 * arrives from somewhere, and the source is part of the reading.
 *
 * Three of the design's four sources exist on this side, measured 2026-09-22:
 *
 * - **Option Scan · IV-rich today** — the scan's own `lens_flags.iv_rank`, and
 *   `hot` is its word, not ours: 121 of the 500 it ranks.
 * - **Watchlist** — 22 names.
 * - **In the book** — the watchlist rows the importer filed from positions,
 *   which is where this app records that a name is held: 11 of the 22.
 *
 * The fourth, *Stock Explorer · a saved screen*, has no store: nothing on this
 * side saves a screen, so there is no list to offer. It is named in the rail
 * rather than left out, because a picker that silently has three options where
 * the design has four reads as a smaller idea rather than a missing one.
 *
 * ## Why a source is capped
 *
 * The screener is slow enough that the list size is a design constraint, not
 * a detail. Measured 2026-09-22: two names answer in 15s, three in 31s, and
 * five and eleven both exceed the client's own 60-second abort — the page
 * shows a timeout instead of a result. Roughly ten seconds a name. So a
 * source hands over the first few and says how many it left: a button that
 * fills the box with 121 names and then always times out is worse than one
 * that takes three and explains itself.
 */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchScan } from '@/api/research/scan'
import { useWatchlist } from '@/hooks/useWatchlist'

export interface ScreenerSource {
  id: string
  label: string
  /** What the source holds. Null when this side has no store for it. */
  symbols: string[] | null
  /** What a click actually takes — the first `SOURCE_CAP` of them. */
  take: string[]
  /** Why there are no symbols, when there are none. */
  absent?: string
}

/** The scan's own page size — the ranking is a page, not a universe. */
const SCAN_PAGE = 500

/**
 * How many symbols a source hands over.
 *
 * Measured against the engine, not chosen: two names answer in 15s, three in
 * 31s, and five already exceeds the 60-second abort. Three is what fits.
 */
export const SOURCE_CAP = 3

export function useScreenerSources(): { sources: ScreenerSource[]; loading: boolean } {
  const watchlist = useWatchlist()
  const scan = useQuery({
    queryKey: ['research', 'scan', 'screener-sources', SCAN_PAGE],
    queryFn: () => fetchScan({ limit: SCAN_PAGE }),
    staleTime: 10 * 60_000,
  })

  const sources = useMemo<ScreenerSource[]>(() => {
    const items = watchlist.data?.items ?? []
    const stk = items.filter((i) => (i.sec_type ?? '').toUpperCase() === 'STK')
    const names = (rows: typeof stk) => [
      ...new Set(rows.map((i) => (i.symbol ?? '').trim().toUpperCase()).filter(Boolean)),
    ]
    const hot = (scan.data?.rows ?? [])
      .filter((r) => r.lens_flags?.iv_rank === 'hot')
      .map((r) => r.symbol)

    const capped = (id: string, label: string, symbols: string[]): ScreenerSource => ({
      id,
      label,
      symbols,
      take: symbols.slice(0, SOURCE_CAP),
    })

    return [
      capped('scan', 'Option Scan · IV-rich today', [...new Set(hot)]),
      {
        id: 'explorer',
        label: 'Stock Explorer · a saved screen',
        symbols: null,
        take: [],
        absent: 'nothing on this side saves a screen, so there is no list to pull',
      },
      capped('book', 'In the book', names(stk.filter((i) => i.source === 'position'))),
      capped('watch', 'Watchlist', names(stk)),
    ]
  }, [watchlist.data, scan.data])

  return { sources, loading: watchlist.isLoading || scan.isLoading }
}
