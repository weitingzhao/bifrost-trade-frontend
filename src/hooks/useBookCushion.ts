/**
 * How close the book's short legs are to assignment — the status bar's reading.
 *
 * The legs and their spots come from `/portfolio/short-legs`, one query. The
 * cushion and the line that makes it "tight" are applied here with the same
 * `shortLegCushion` / `cushionBand` / `useCushionThreshold` the Positions page
 * uses, so the bar and the page cannot disagree: there is one rule and one
 * warning line, read twice.
 */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchShortLegs, type ShortLeg } from '@/api/shortLegs'
import { useCushionThreshold } from '@/hooks/useCushionThreshold'
import { cushionBand, shortLegCushion } from '@/utils/positionsOptionRisk'

/** Slow: assignment risk moves with spot, not with the second hand. */
const REFETCH_MS = 60_000

export interface BookCushion {
  /** Short legs at or inside the trader's warning line, in the money included. */
  tightCount: number
  /** Short legs already in the money — the subset that is past warning. */
  breachedCount: number
  /** Legs whose underlying had no quote. Not safe, not tight: unknown. */
  unpricedCount: number
  shortLegCount: number
  /** The trader's line, so the label can name it. */
  tightPct: number
  isLoading: boolean
  /** The read failed. Distinct from a book with no short legs. */
  isError: boolean
}

export function useBookCushion(enabled: boolean): BookCushion {
  const { pct: tightPct } = useCushionThreshold()
  const query = useQuery({
    queryKey: ['portfolio', 'short-legs'],
    queryFn: ({ signal }) => fetchShortLegs(signal),
    enabled,
    refetchInterval: enabled ? REFETCH_MS : false,
    refetchOnWindowFocus: false,
    staleTime: REFETCH_MS / 2,
    retry: 1,
  })

  return useMemo(
    () => ({
      ...countCushionBands(query.data?.legs ?? [], tightPct),
      tightPct,
      isLoading: query.isLoading,
      isError: query.isError,
    }),
    [query.data, query.isLoading, query.isError, tightPct],
  )
}

/** Exported for its own test: the counting is the part with rules in it. */
export function countCushionBands(
  legs: readonly ShortLeg[],
  tightPct: number,
): Pick<BookCushion, 'tightCount' | 'breachedCount' | 'unpricedCount' | 'shortLegCount'> {
  let tightCount = 0
  let breachedCount = 0
  let unpricedCount = 0

  for (const leg of legs) {
    if (leg.strike == null || leg.right == null || leg.spot == null) {
      unpricedCount += 1
      continue
    }
    const cushion = shortLegCushion(leg.right, leg.strike, leg.spot)
    if (cushion == null) {
      unpricedCount += 1
      continue
    }
    const band = cushionBand(cushion, tightPct)
    if (band === 'breached') breachedCount += 1
    // Breached legs are tight too: past the line is not a separate place from
    // near it, and a count that excluded them would fall as things got worse.
    if (band !== 'comfortable') tightCount += 1
  }

  return { tightCount, breachedCount, unpricedCount, shortLegCount: legs.length }
}
