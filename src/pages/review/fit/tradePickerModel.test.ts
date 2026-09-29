import { describe, expect, it } from 'vitest'
import type { ReviewTrade } from '@/utils/reviewTrades'
import { filterTrades, groupTrades, outcomeCount, stepTrade } from './tradePickerModel'

const t = (key: string, over: Partial<ReviewTrade>): ReviewTrade =>
  ({ contractKey: key, label: key, underlying: 'AAA', expiry: '2026-01-16', realised: 10, play: null, tradeId: null, ...over }) as ReviewTrade

const trades = [
  t('o', { underlying: 'CCC', realised: 3, exitKind: 'open' }),
  t('a', { underlying: 'AAA', expiry: '2026-02-20', realised: 50, tradeId: 11, play: 'Wheel' }),
  t('b', { underlying: 'BBB', expiry: '2026-01-16', realised: -20 }),
  t('c', { underlying: 'AAA', expiry: '2026-01-09', realised: 5 }),
]

describe('Trade review picker (Rev .104)', () => {
  it('filters by outcome and search, and leaves Broke plan unknowable rather than zero', () => {
    expect(filterTrades(trades, 'open', '').map((x) => x.contractKey)).toEqual(['o'])
    expect(filterTrades(trades, 'won', '').map((x) => x.contractKey)).toEqual(['a', 'c'])
    expect(filterTrades(trades, 'lost', '').map((x) => x.contractKey)).toEqual(['b'])
    expect(filterTrades(trades, 'all', '#11').map((x) => x.contractKey)).toEqual(['a'])
    expect(filterTrades(trades, 'all', 'wheel').map((x) => x.contractKey)).toEqual(['a'])
    expect(outcomeCount(trades, 'won')).toBe(2)
    expect(outcomeCount(trades, 'broke')).toBeNull()
    expect(filterTrades(trades, 'broke', '')).toEqual([])
  })

  it('groups by symbol (largest first) and by expiry month (newest first), with count and net', () => {
    expect(groupTrades(trades.slice(1), 'sym').map((g) => [g.label, g.count, g.net])).toEqual([
      ['AAA', 2, 55],
      ['BBB', 1, -20],
    ])
    expect(groupTrades(trades.slice(1), 'exp').map((g) => [g.label, g.count])).toEqual([
      ['FEB 2026', 1],
      ['JAN 2026', 2],
    ])
    expect(groupTrades(trades.slice(1), 'none')[0]).toMatchObject({ label: null, count: 3, net: 35 })
  })

  it('steps through the whole list, wrapping', () => {
    expect(stepTrade(trades, 'o', -1)?.contractKey).toBe('c')
    expect(stepTrade(trades, 'c', 1)?.contractKey).toBe('o')
    expect(stepTrade([], 'a', 1)).toBeNull()
  })
})
