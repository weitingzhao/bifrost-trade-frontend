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
 * ## A source hands over the whole list
 *
 * Until 2026-09-27 a source took its first three: the engine cost about ten
 * seconds a name (measured 2026-09-22) and five names ran past the 60-second
 * abort. The engine fix of 2026-09-27 took that away — three names answer in
 * 0.3 s, eleven in under 2 s — and the Owner lifted the cap the same day. A
 * click now screens every name the list holds.
 */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchScan } from '@/api/research/scan'
import { useWatchlist } from '@/hooks/useWatchlist'

export interface ScreenerSource {
  id: string
  label: string
  /** What the source holds, and what a click screens. Null when this side has no store for it. */
  symbols: string[] | null
  /** Why there are no symbols, when there are none. */
  absent?: string
}

/** The scan's own page size — the ranking is a page, not a universe. */
const SCAN_PAGE = 500

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

    return [
      { id: 'scan', label: 'Option Scan · IV-rich today', symbols: [...new Set(hot)] },
      {
        id: 'explorer',
        label: 'Stock Explorer · a saved screen',
        symbols: null,
        absent: 'nothing on this side saves a screen, so there is no list to pull',
      },
      { id: 'book', label: 'In the book', symbols: names(stk.filter((i) => i.source === 'position')) },
      { id: 'watch', label: 'Watchlist', symbols: names(stk) },
    ]
  }, [watchlist.data, scan.data])

  return { sources, loading: watchlist.isLoading || scan.isLoading }
}
