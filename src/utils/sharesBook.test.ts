import { describe, expect, it } from 'vitest'
import type { LivePositionRow } from '@/types/positions'
import type { CoverRow } from '@/utils/bookVsBase'
import { buildShareRows, groupShareRows, sharesTotal, ttmDistributionYield, unrealizedPctText } from './sharesBook'

// Invented holdings (fixtures are never copied from DEV).
const pos = (over: Partial<LivePositionRow>): LivePositionRow =>
  ({ account_id: 'U0000001', secType: 'STK', position: 100, avgCost: 10, price: 12, ...over }) as LivePositionRow

const stocks = [
  pos({ symbol: 'AAA', contract_key: 'AAA', position: 450, category: 'Core', category_id: 1 }),
  pos({ symbol: 'BBB', contract_key: 'BBB', position: 80, category: '' }),
  pos({ symbol: 'FIX', contract_key: 'FIX', position: 200, category: 'Fix Income', price: 20, avgCost: 21 }),
  pos({ symbol: 'TBL', contract_key: 'TBL', position: 50, category: 'Cash', price: 100, avgCost: 100 }),
]
const cover: CoverRow[] = [{ accountId: 'U0000001', symbol: 'AAA', held: 450, backing: 300, spare: 150, moreCalls: 1, price: 12 }]

describe('Positions › Shares (Rev .115)', () => {
  const rows = buildShareRows({ stocks, quotesBySymbol: {}, benchBySymbol: {}, cover })

  it('types each holding from its category and backs calls with stock only', () => {
    expect(rows.map((r) => [r.symbol, r.bucket])).toEqual([
      ['AAA', 'stk'],
      ['TBL', 'cash'],
      ['FIX', 'fi'],
      ['BBB', 'stk'],
    ])
    expect(rows.find((r) => r.symbol === 'AAA')?.backing).toEqual({ held: 450, behindCalls: 300, spare: 150, spareCalls: 1 })
    // A stock with no short calls against it: every whole hundred is a spare call.
    expect(rows.find((r) => r.symbol === 'BBB')?.backing).toEqual({ held: 80, behindCalls: 0, spare: 80, spareCalls: 0 })
    expect(rows.find((r) => r.symbol === 'FIX')?.backing).toBeNull()
  })

  it('reads Unrealized as market value less cost', () => {
    expect(rows.find((r) => r.symbol === 'FIX')?.unreal).toBe(-200)
  })

  it('groups by category in the Owner’s order, Uncategorised last, and totals the calls spare', () => {
    const g = groupShareRows(rows, 'cat', ['Cash', 'Core', 'Fix Income'])
    expect(g.map((x) => [x.label, x.rows.length])).toEqual([
      ['Cash', 1],
      ['Core', 1],
      ['Fix Income', 1],
      ['Uncategorised', 1],
    ])
    expect(g.find((x) => x.label === 'Cash')?.callsSpare).toBeNull()
    expect(sharesTotal(rows).callsSpare).toBe(1)
  })

  it('groups by type in the design’s order and leaves empty types out', () => {
    expect(groupShareRows(rows, 'type', []).map((x) => x.label)).toEqual(['Stocks', 'Fixed income', 'Cash-like'])
    expect(groupShareRows(rows.filter((r) => r.bucket === 'stk'), 'type', []).map((x) => x.label)).toEqual(['Stocks'])
  })

  it('takes a trailing-twelve-month distribution yield over the mark', () => {
    const divs = [
      { ex_date: '2026-09-01', amount: 0.1 },
      { ex_date: '2026-03-01', amount: 0.1 },
      { ex_date: '2025-08-01', amount: 5 },
    ]
    expect(ttmDistributionYield(divs, 10, '2026-09-30')).toBeCloseTo(2)
    expect(ttmDistributionYield([], 10, '2026-09-30')).toBeNull()
    expect(ttmDistributionYield(divs, null, '2026-09-30')).toBeNull()
  })
})

describe('unrealized % past the bound (Rev .119)', () => {
  it('reads ±999% as a bound and keeps the exact figure in the title', () => {
    expect(unrealizedPctText(12.345)).toEqual({ text: '+12.35%' })
    expect(unrealizedPctText(3656.86)).toEqual({
      text: '>+999%',
      title: '+3656.86% — average cost is lowered by premium from calls sold against the shares',
    })
    expect(unrealizedPctText(-1200).text).toBe('<−999%')
    expect(unrealizedPctText(null)).toEqual({ text: '—' })
  })
})
