/**
 * The habits, and the mark paths they are read from.
 *
 * Kept apart from `useReviewContracts` because the paths are 46 requests: the
 * queue and Trade review have no use for them, and a page should not pay for a
 * read it does not make. Habits and Rule proposals both do, and they share one
 * cache entry — and since 2026-09-26 the same holds for the IV-rank history.
 */
import { useMemo } from 'react'
import { useReviewContracts } from '@/hooks/useReviewContracts'
import { useBookMarkPaths } from '@/hooks/useBookMarkPaths'
import { useEntryIvRanks } from '@/hooks/useEntryIvRanks'
import { habitReadings } from '@/utils/reviewHabits'
import { playbookStats } from '@/utils/reviewContracts'

export function useReviewHabits(accountFilter: string) {
  const book = useReviewContracts(accountFilter)
  const marks = useBookMarkPaths(book.trades)
  // IV rank at entry is read here, once, so Habits and the Decision Inbox's
  // IV-floor card argue from the same reading (§14.2).
  const ranks = useEntryIvRanks(book.trades)
  const ivRanks = useMemo(
    () => ({ rowsByName: ranks.rowsByName, loading: ranks.loading }),
    [ranks.rowsByName, ranks.loading],
  )

  const habits = useMemo(
    () => habitReadings(book.trades, marks.paths, marks.loading, ivRanks),
    [book.trades, marks.paths, marks.loading, ivRanks],
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
    /** Each name's trailing year of IV rank — a page that narrows the trades re-reads the habits with it. */
    ivRanks,
    /** Names whose IV-rank read failed — their trades leave the sample. */
    ivRankFailed: ranks.failed,
    ivRankNames: ranks.names,
  }
}
