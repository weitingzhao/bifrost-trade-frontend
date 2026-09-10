/**
 * Which of the four things a data surface is actually saying.
 *
 * Across the app, 21 components that render a query rendered only three of
 * them: loading, empty, and content. The fourth — the request did not land —
 * fell through to the empty branch, so a failed fetch said whatever the empty
 * copy said. That copy is rarely neutral. It asserts:
 *
 *   "No Option or Stock PnL in the selected range."
 *   "No upcoming events"
 *   "No option data found for NVDA"
 *
 * Each of those is a claim about the market or the book, stated with the same
 * confidence whether it was measured or merely not asked. On a trading surface
 * that is the expensive kind of wrong: it reads as an answer.
 *
 * The rule is one line — **not knowing is its own state** — and this is where
 * it is decided, so no component has to remember to think of it.
 */
export type DataState = 'loading' | 'failed' | 'empty' | 'ready'

export interface DataStateInput {
  /** No answer yet. React Query's isPending / isLoading. */
  isPending?: boolean
  isError?: boolean
  /** The caller's own read of its rows — this module never counts anything. */
  isEmpty: boolean
}

/**
 * Content wins over an error: a stale list still beats a blank panel, and a
 * refetch failure should not wipe what the reader was looking at. Only when
 * there is nothing to show does the reason for having nothing start to matter.
 */
export function dataState({ isPending, isError, isEmpty }: DataStateInput): DataState {
  if (!isEmpty) return 'ready'
  if (isError) return 'failed'
  if (isPending) return 'loading'
  return 'empty'
}
