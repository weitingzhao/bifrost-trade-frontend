/**
 * Which trades Single trade's ‹ › walks, and where one stands (design Rev .110).
 *
 *   arrived from Queue (`in=list&list=…`)  Queue's row order, as it was
 *   arrived for one trade (`?t=` / token / Facts)  every instance
 *   neither                                 the awaiting queue — closed, no confirmed review
 */
import type { TradeReview } from '@/api/tradeReviews'
import type { ReviewInstance } from '@/utils/reviewInstances'

export type ReviewState = 'awaiting' | 'reviewed' | 'interim'

export function reviewState(t: ReviewInstance, review: TradeReview | undefined): ReviewState {
  if (t.open) return 'interim'
  return review?.reviewed ? 'reviewed' : 'awaiting'
}

export function isAwaiting(t: ReviewInstance, reviews: ReadonlyMap<number, TradeReview>): boolean {
  return !t.open && t.instanceId != null && !reviews.get(t.instanceId)?.reviewed
}

export function reviewWalk(
  trades: readonly ReviewInstance[],
  reviews: ReadonlyMap<number, TradeReview>,
  from: { explicit: boolean; list: string | null },
): { trades: ReviewInstance[]; label: string } {
  if (from.list) {
    const byId = new Map(trades.filter((t) => t.instanceId != null).map((t) => [t.instanceId as number, t]))
    const ordered = from.list
      .split(',')
      .map((x) => byId.get(Number(x.replace('#', ''))))
      .filter((t): t is ReviewInstance => t != null)
    if (ordered.length > 0) return { trades: ordered, label: 'in Queue’s order' }
  }
  if (from.explicit) return { trades: [...trades], label: 'all trades' }
  const awaiting = trades.filter((t) => isAwaiting(t, reviews))
  return awaiting.length > 0 ? { trades: awaiting, label: 'awaiting review' } : { trades: [...trades], label: 'all reviewed' }
}
