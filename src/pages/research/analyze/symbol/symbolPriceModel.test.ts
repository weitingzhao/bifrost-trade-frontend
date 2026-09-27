import { describe, expect, it } from 'vitest'
import type { Execution } from '@/types/positions'
import type { SymbolLeg } from '@/pages/research/analyze/symbol/selectLegs'
import {
  aggFor,
  aggIndexFor,
  aggregateBars,
  expiryToIso,
  fmtPl,
  sessionIndexFor,
  sessionsForWindow,
  sessionsUntil,
  tradeSegmentsFor,
  underlyingOf,
  windowForSessionsAgo,
} from './symbolPriceModel'

// Invented fixture — an OCC symbol carries its underlying padded to six chars.
function fill(over: Partial<Execution>): Execution {
  return {
    account_executions_id: null,
    account_id: 'U0000000',
    contract_key: 'ZZTM  270115P00100000|OPT|20270115|100|P',
    symbol: 'ZZTM  270115P00100000',
    sec_type: 'OPT',
    strike: 100,
    expiry: '20270115',
    option_right: 'P',
    side: 'Sell',
    qty: 1,
    quantity: 1,
    price: 2.5,
    time: 1750000000,
    trade_date: '2026-08-03',
    ...over,
  } as Execution
}

describe('windows and aggregation', () => {
  it('weekly kicks in past 130 sessions', () => {
    expect(aggFor(60)).toBe(1)
    expect(aggFor(120)).toBe(1)
    expect(aggFor(250)).toBe(5)
    expect(sessionsForWindow('60', 500)).toBe(60)
    expect(sessionsForWindow('all', 500)).toBe(500)
  })

  it('aggregates OHLCV with the newest bar anchoring a whole group', () => {
    const daily = Array.from({ length: 11 }, (_, i) => ({
      time: 1000 + i * 86400,
      open: 10 + i,
      high: 20 + i,
      low: 5 + i,
      close: 11 + i,
      volume: 100,
    }))
    const weekly = aggregateBars(daily, 5)
    // 11 = 1 + 5 + 5 anchored at the end: the first group is the single oldest bar.
    expect(weekly.map((w) => w.volume)).toEqual([100, 500, 500])
    const last = weekly[weekly.length - 1]
    expect(last.open).toBe(10 + 6)
    expect(last.close).toBe(11 + 10)
    expect(last.high).toBe(20 + 10)
    expect(last.low).toBe(5 + 6)
  })
})

describe('dates', () => {
  it('expiry normalizes from either spelling', () => {
    expect(expiryToIso('20270115')).toBe('2027-01-15')
    expect(expiryToIso('2027-01-15')).toBe('2027-01-15')
    expect(expiryToIso('')).toBeNull()
  })

  it('sessionsUntil counts weekdays only', () => {
    // Fri 2026-09-25 → Mon 2026-09-28 is one session.
    expect(sessionsUntil('2026-09-25', '2026-09-28')).toBe(1)
    expect(sessionsUntil('2026-09-25', '2026-10-02')).toBe(5)
    expect(sessionsUntil('2026-09-25', '2026-09-25')).toBe(0)
  })

  it('sessionIndexFor lands a weekend fill on the prior session', () => {
    const dates = ['2026-09-21', '2026-09-22', '2026-09-24']
    expect(sessionIndexFor(dates, '2026-09-22')).toBe(1)
    expect(sessionIndexFor(dates, '2026-09-23')).toBe(1)
    expect(sessionIndexFor(dates, '2026-09-30')).toBe(2)
    expect(sessionIndexFor(dates, '2026-09-20')).toBeNull()
  })
})

describe('trade segments', () => {
  const legs: SymbolLeg[] = [
    {
      key: 'a',
      kind: 'OPT',
      qty: -1,
      avgCost: 2.1,
      price: 1.4,
      unrealized: 70,
      right: 'P',
      strike: 90,
      expiry: '20270115',
    },
  ]

  it('pairs a closed contract and names it by the earliest side', () => {
    const segs = tradeSegmentsFor(
      [
        fill({ side: 'Sell', trade_date: '2026-08-03', time: 100 }),
        fill({ side: 'Buy', trade_date: '2026-09-02', time: 200, price: 1.1 }),
      ],
      'ZZTM',
      [],
    )
    expect(segs).toHaveLength(1)
    expect(segs[0].name).toBe('STO 100P')
    expect(segs[0].openDate).toBe('2026-08-03')
    expect(segs[0].closeDate).toBe('2026-09-02')
    expect(segs[0].pnlIsMark).toBe(false)
    // 2.5 sold, 1.1 bought back ×100 = +140 before commissions.
    expect(segs[0].pnl).toBeCloseTo(140, 0)
  })

  it('an open contract runs to null close and takes its mark from the legs', () => {
    const segs = tradeSegmentsFor(
      [
        fill({
          symbol: 'ZZTM  270115P00090000',
          contract_key: 'ZZTM  270115P00090000|OPT|20270115|90|P',
          strike: 90,
          side: 'Sell',
          trade_date: '2026-09-10',
        }),
      ],
      'ZZTM',
      legs,
    )
    expect(segs).toHaveLength(1)
    expect(segs[0].closeDate).toBeNull()
    expect(segs[0].pnl).toBe(70)
    expect(segs[0].pnlIsMark).toBe(true)
  })

  it('other underlyings and stock fills stay out', () => {
    const segs = tradeSegmentsFor(
      [
        fill({ symbol: 'OTHR  270115P00100000', contract_key: 'OTHR|OPT|20270115|100|P' }),
        fill({ sec_type: 'STK', symbol: 'ZZTM' }),
      ],
      'ZZTM',
      [],
    )
    expect(segs).toHaveLength(0)
  })
})

describe('window jumps and labels', () => {
  it('picks the smallest window that fits', () => {
    expect(windowForSessionsAgo(10)).toBe('60')
    expect(windowForSessionsAgo(58)).toBe('120')
    expect(windowForSessionsAgo(150)).toBe('250')
    expect(windowForSessionsAgo(400)).toBe('all')
  })

  it('P&L uses a true minus', () => {
    expect(fmtPl(310)).toBe('+$310')
    expect(fmtPl(-145)).toBe('−$145')
  })

  it('underlyingOf strips OCC padding', () => {
    expect(underlyingOf('ZZTM  270115P00100000')).toBe('ZZTM')
    expect(underlyingOf(null)).toBe('')
  })
})

describe('aggIndexFor', () => {
  it('mirrors the end-anchored grouping', () => {
    // 11 dailies at agg 5 → groups of 1, 5, 5.
    expect(aggIndexFor(11, 5, 0)).toBe(0)
    expect(aggIndexFor(11, 5, 1)).toBe(1)
    expect(aggIndexFor(11, 5, 5)).toBe(1)
    expect(aggIndexFor(11, 5, 6)).toBe(2)
    expect(aggIndexFor(11, 5, 10)).toBe(2)
    expect(aggIndexFor(10, 5, 9)).toBe(1)
    expect(aggIndexFor(60, 1, 42)).toBe(42)
  })
})
