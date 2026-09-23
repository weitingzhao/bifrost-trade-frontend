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
import { bookLegRows, byExpiry, filterLegsBySymbol, marksStanding, sumLegs, type BookLegInput } from './bookGreeksModel'

/**
 * @param filterSym `?sym=` — narrows the book to one underlying. A filter, not
 * a scope: the page's subject is the whole book either way.
 */
export function useBookGreeks(todayIso: string, filterSym?: string | null) {
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

  const allRows = bookLegRows(legs, book.greeks, { todayIso, tightPct })
  /**
   * Book legs before netting, for the name in view.
   *
   * `bookLegRows` nets per contract; the book itself holds one leg per account
   * × strategy instance, so the same contract held three ways is three legs
   * and one row. Risk › Exposure counts the legs, this page counts the
   * contracts — both right, and a reader who clicks «3» and lands on «1» has
   * no way to know that unless the page says it.
   */
  const rawLegCount = (filterSym ?? '').trim()
    ? legs.filter((l) => l.underlying.trim().toUpperCase() === filterSym!.trim().toUpperCase())
        .length
    : legs.length
  const rows = filterLegsBySymbol(allRows, filterSym)
  const filtered = !!(filterSym ?? '').trim()

  return {
    groups: byExpiry(rows),
    rows,
    /** Every leg, before `?sym=` — what the empty state is measured against. */
    allRows,
    filtered,
    rawLegCount,
    /**
     * Unfiltered this is Risk › Exposure's own rollup, read rather than
     * recomputed (§14.2). Under a filter there is no rollup for a subset, so
     * the same sum is taken over the legs in view.
     */
    legTotals: filtered ? sumLegs(rows) : null,
    /** The rollup itself, printed with Risk › Exposure's captions. */
    totals: book.greeks,
    marks: marksStanding(book.greeks, rows),
    spotMix: book.alarm.spotMix,
    tightPct,
    isLoading: book.greeks.isLoading,
    isError: book.greeks.isError,
  }
}
