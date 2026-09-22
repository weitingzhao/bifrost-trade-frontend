/**
 * The book's option legs with their greeks, from the hooks the other pages use.
 *
 * Nothing is fetched here that `usePositionsBook` is not already fetching:
 * this page is a second reader of the same rollup Risk › Exposure prints
 * (§14.2), which is what makes the design's promise — *this page never
 * re-aggregates differently* — true by construction rather than by care.
 */
import { usePositionsBook } from '@/hooks/usePositionsBook'
import { useCushionThreshold } from '@/hooks/useCushionThreshold'
import { bookLegRows, byExpiry, marksStanding, type BookLegInput } from './bookGreeksModel'

export function useBookGreeks(todayIso: string) {
  const { pct: tightPct } = useCushionThreshold()
  // The whole book, both accounts, no symbol or expiry filter: this page is
  // about every leg, which is the one thing Positions' scope strip can hide.
  const book = usePositionsBook(
    { accountFilter: { host: true, secondary: true }, filterSymbol: '', filterExpiry: '' },
    tightPct,
  )

  const legs: BookLegInput[] = book.alarm.legs.map((l) => ({
    underlying: l.underlying,
    expiry: l.expiry,
    strike: l.strike,
    right: l.right,
    qty: l.qty,
    spot: book.alarm.resolveSpot(l.underlying)?.price ?? null,
  }))

  const rows = bookLegRows(legs, book.greeks, { todayIso, tightPct })

  return {
    groups: byExpiry(rows),
    rows,
    /** The rollup itself, printed with Risk › Exposure's captions. */
    totals: book.greeks,
    marks: marksStanding(book.greeks, rows),
    spotMix: book.alarm.spotMix,
    tightPct,
    isLoading: book.greeks.isLoading,
    isError: book.greeks.isError,
  }
}
