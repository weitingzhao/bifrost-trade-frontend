/**
 * The habits, and the mark paths they are read from.
 *
 * Kept apart from `useReviewTrades` because the paths are 46 requests: the
 * queue and Single trade have no use for them, and a page should not pay for a
 * read it does not make. Habits and Rule proposals both do, and they share one
 * cache entry.
 */
import { useMemo } from 'react'
import { useReviewTrades } from '@/hooks/useReviewTrades'
import { useBookMarkPaths } from '@/hooks/useBookMarkPaths'
import { habitReadings } from '@/utils/reviewHabits'
import { playbookStats } from '@/utils/reviewTrades'

export function useReviewHabits(accountFilter: string) {
  const book = useReviewTrades(accountFilter)
  const marks = useBookMarkPaths(book.trades)

  const habits = useMemo(
    () => habitReadings(book.trades, marks.paths, marks.loading),
    [book.trades, marks.paths, marks.loading],
  )
  // Re-derived with the paths so a play's MAE column is not a second
  // computation of the same trades (§14.2).
  const plays = useMemo(() => playbookStats(book.trades, marks.paths), [book.trades, marks.paths])

  return {
    ...book,
    habits,
    plays,
    paths: marks.paths,
    /** Closed trades the warehouse has no path for — excluded from every path habit. */
    withoutPath: marks.without,
    pathRequests: marks.requests,
    pathsLoading: marks.loading,
    pathsError: marks.error,
  }
}
