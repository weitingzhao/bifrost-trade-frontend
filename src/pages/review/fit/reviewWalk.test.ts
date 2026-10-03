import { describe, expect, it } from 'vitest'
import type { TradeReview } from '@/api/tradeReviews'
import type { ReviewedTrade } from '@/utils/reviewedTrades'
import { reviewState, reviewWalk } from './reviewWalk'

// Invented instances: only the fields the walk reads.
const t = (id: number, open = false) => ({ tradeId: id, open, contractKey: `K${id}` }) as unknown as ReviewedTrade
const reviewed = (id: number) => [id, { trade_id: id, tags_added_json: [], tags_dropped_json: [], reviewed: true }] as [number, TradeReview]

describe('reviewWalk', () => {
  const trades = [t(1), t(2, true), t(3), t(4)]
  const reviews = new Map([reviewed(3)])

  it('walks the awaiting queue when no trade was asked for', () => {
    const w = reviewWalk(trades, reviews, { explicit: false, list: null })
    expect(w.trades.map((x) => x.tradeId)).toEqual([1, 4])
    expect(w.label).toBe('awaiting review')
  })

  it('walks every trade when one was asked for by id', () => {
    expect(reviewWalk(trades, reviews, { explicit: true, list: null }).trades).toHaveLength(4)
  })

  it('keeps Queue’s row order when arrived from Queue, dropping ids it cannot find', () => {
    const w = reviewWalk(trades, reviews, { explicit: true, list: '4,#1,99' })
    expect(w.trades.map((x) => x.tradeId)).toEqual([4, 1])
  })

  it('falls back to every trade once nothing is waiting', () => {
    const all = new Map([reviewed(1), reviewed(3), reviewed(4)])
    expect(reviewWalk(trades, all, { explicit: false, list: null }).label).toBe('all reviewed')
  })
})

describe('reviewState', () => {
  it('reads interim while open, then awaiting until confirmed', () => {
    expect(reviewState(t(2, true), undefined)).toBe('interim')
    expect(reviewState(t(1), undefined)).toBe('awaiting')
    expect(reviewState(t(3), reviewed(3)[1])).toBe('reviewed')
  })
})
