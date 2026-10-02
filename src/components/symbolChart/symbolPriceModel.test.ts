import { describe, expect, it } from 'vitest'
import type { Execution } from '@/types/positions'
import type { SymbolLeg } from '@/utils/selectLegs'
import {
  aggFor,
  aggIndexFor,
  aggregateBars,
  expiryToIso,
  fmtPl,
  sessionIndexFor,
  sessionsForWindow,
  sessionsUntil,
  holdingFor,
  instanceTracksFor,
  MIN_SPAN,
  panView,
  zoomView,
  underlyingOf,
  windowForSessionsAgo,
} from '@/components/symbolChart/symbolPriceModel'

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

describe('instance tracks (Rev .102)', () => {
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
  const K90 = { symbol: 'ZZTM  270115P00090000', contract_key: 'ZZTM  270115P00090000|OPT|20270115|90|P', strike: 90 }

  it('a flat leg is realized, named by the instance and its last leg', () => {
    const [t] = instanceTracksFor(
      [
        fill({ side: 'Sell', trade_date: '2026-08-03', time: 100, strategy_instance_id: 7 }),
        fill({ side: 'Buy', trade_date: '2026-09-02', time: 200, price: 1.1, strategy_instance_id: 7 }),
      ],
      'ZZTM',
      [],
    )
    expect(t.name).toBe('#7 −1 100P')
    expect(t.closeDate).toBe('2026-09-02')
    // 2.5 sold, 1.1 bought back ×100 = +140 before commissions.
    expect(t.pnl).toBeCloseTo(140, 0)
    expect(t.pnlIsMark).toBe(false)
  })

  it('an open leg keeps the track open and takes its mark from the monitor', () => {
    const [t] = instanceTracksFor([fill({ ...K90, side: 'Sell', trade_date: '2026-09-10', strategy_instance_id: 8 })], 'ZZTM', legs)
    expect(t.closeDate).toBeNull()
    expect(t.pnl).toBe(70)
    expect(t.pnlIsMark).toBe(true)
  })

  it('a roll is a leg going flat the day another opens under the same instance, with the day’s net', () => {
    const [t] = instanceTracksFor(
      [
        fill({ side: 'Sell', trade_date: '2026-08-03', time: 1, price: 2.5, strategy_instance_id: 9 }),
        fill({ side: 'Buy', trade_date: '2026-08-20', time: 2, price: 3.0, strategy_instance_id: 9 }),
        fill({ ...K90, side: 'Sell', trade_date: '2026-08-20', time: 3, price: 3.4, strategy_instance_id: 9 }),
      ],
      'ZZTM',
      [],
    )
    expect(t.legs.map((l) => [l.strike, l.flatDate])).toEqual([
      [100, '2026-08-20'],
      [90, null],
    ])
    expect(t.joints).toEqual([{ date: '2026-08-20', fromStrike: 100, toStrike: 90, net: 40 }])
    expect(t.name).toBe('#9 −1 90P')
  })

  it('a same-day roll names the leg opened last, whatever its strike', () => {
    const [t] = instanceTracksFor(
      [
        fill({ side: 'Sell', trade_date: '2026-08-20', time: 1, strategy_instance_id: 12 }),
        fill({ side: 'Buy', trade_date: '2026-08-20', time: 2, strategy_instance_id: 12 }),
        fill({ ...K90, side: 'Sell', trade_date: '2026-08-20', time: 3, strategy_instance_id: 12 }),
      ],
      'ZZTM',
      [],
    )
    expect(t.name).toBe('#12 −1 90P')
    expect(t.joints).toHaveLength(1)
  })

  it('an open leg is named at its open size, not the most it ever held', () => {
    const [t] = instanceTracksFor(
      [
        fill({ side: 'Sell', quantity: 5, time: 1, strategy_instance_id: 11 }),
        fill({ side: 'Buy', quantity: 2, time: 2, trade_date: '2026-08-10', strategy_instance_id: 11 }),
      ],
      'ZZTM',
      [],
    )
    expect(t.name).toBe('#11 −3 100P')
  })

  it('fills no instance claims make one plain track; other names and stock stay out', () => {
    const tracks = instanceTracksFor(
      [
        fill({ strategy_instance_id: null }),
        fill({ symbol: 'OTHR  270115P00100000', contract_key: 'OTHR|OPT|20270115|100|P', strategy_instance_id: 3 }),
        fill({ sec_type: 'STK', symbol: 'ZZTM', strategy_instance_id: 3 }),
      ],
      'ZZTM',
      [],
    )
    expect(tracks.map((t) => [t.id, t.name])).toEqual([[null, 'no trade · −1 100P']])
  })
})

describe('holding (Rev .102)', () => {
  const stk = (qty: number, avgCost: number | null): SymbolLeg => ({ key: `s${qty}`, kind: 'STK', qty, avgCost, price: null, unrealized: null })
  it('blends accounts and splits backing under open short calls from free', () => {
    const tracks = instanceTracksFor(
      [
        fill({ symbol: 'ZZTM  270115C00120000', contract_key: 'ZZTM  270115C00120000|OPT|20270115|120|C', option_right: 'C', strike: 120, quantity: 2, strategy_instance_id: 4 }),
      ],
      'ZZTM',
      [],
    )
    expect(holdingFor([stk(300, 100), stk(100, 120)], tracks)).toEqual({
      qty: 400,
      avg: 105,
      backing: [{ id: 4, qty: 200 }],
      free: 200,
    })
  })
  it('no shares, no line', () => {
    expect(holdingFor([], [])).toBeNull()
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

describe('pointer view (Rev .102)', () => {
  it('pans toward history and stops at both ends', () => {
    expect(panView(500, { span: 60, off: 0 }, 30)).toEqual({ span: 60, off: 30 })
    expect(panView(500, { span: 60, off: 0 }, -10)).toEqual({ span: 60, off: 0 })
    expect(panView(500, { span: 60, off: 400 }, 100)).toEqual({ span: 60, off: 440 })
  })

  it('zooms about the cursor: the session under it stays put', () => {
    // span 100 ending today; cursor at the middle is session 450.
    const v = zoomView(500, { span: 100, off: 0 }, 0.5, 0.5)
    expect(v.span).toBe(50)
    const start = 500 - v.off - v.span
    expect(start + 0.5 * v.span).toBe(450)
  })

  it('never narrower than the floor nor wider than the history', () => {
    expect(zoomView(500, { span: 30, off: 0 }, 1, 0.1).span).toBe(MIN_SPAN)
    expect(zoomView(500, { span: 400, off: 0 }, 0, 5)).toEqual({ span: 500, off: 0 })
  })
})
