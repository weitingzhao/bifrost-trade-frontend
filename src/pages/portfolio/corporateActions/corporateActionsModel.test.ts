import { describe, expect, it } from 'vitest'
import { daysBetween } from '@/lib/isoDate'
import {
  buildBookEvents,
  feedReach,
  recentHistory,
  splitAdjustedQty,
  sliceByUnderlying,
  splitAdjustedStrike,
  upcoming,
  type FeedRow,
} from './corporateActionsModel'

const TODAY = '2026-09-17'

/** Invented rows — the shapes the feed produces, not the book's own figures. */
const rows: FeedRow[] = [
  {
    symbol: 'ZEBR',
    action_type: 'dividend',
    ex_date: '2026-09-10',
    record_date: '2026-09-10',
    payment_date: '2026-10-01',
    ratio_from: null,
    ratio_to: null,
    amount: 0.5,
  },
  {
    symbol: 'ZEBR',
    action_type: 'split',
    ex_date: '2026-09-25',
    record_date: null,
    payment_date: null,
    ratio_from: 1,
    ratio_to: 4,
    amount: null,
  },
  {
    symbol: 'QUOK',
    action_type: 'dividend',
    ex_date: '2026-03-02',
    record_date: null,
    payment_date: '2026-03-20',
    ratio_from: null,
    ratio_to: null,
    amount: 0.2,
  },
  {
    symbol: 'NODT',
    action_type: 'dividend',
    ex_date: null,
    record_date: null,
    payment_date: null,
    ratio_from: null,
    ratio_to: null,
    amount: 0.1,
  },
]

const shares = new Map([
  ['ZEBR', 300],
  ['QUOK', 100],
])
const legs = new Set(['ZEBR'])

describe('buildBookEvents', () => {
  it('sizes an event against the book it can see, and leaves it null when it cannot', () => {
    const events = buildBookEvents({ rows, sharesBySymbol: shares, legSymbols: legs, today: TODAY })
    const div = events.find((e) => e.symbol === 'ZEBR' && e.kind === 'dividend')
    expect(div?.onTodaysHolding).toBeCloseTo(150)
    // A split has no per-share amount, so there is nothing to size — and a name
    // the book does not hold shares in has no count to multiply by.
    expect(events.find((e) => e.kind === 'split')?.onTodaysHolding).toBeNull()
    expect(events.find((e) => e.symbol === 'NODT')?.onTodaysHolding).toBeNull()
  })

  it('marks only the names carrying an open leg as reshaping a contract', () => {
    const events = buildBookEvents({ rows, sharesBySymbol: shares, legSymbols: legs, today: TODAY })
    expect(events.filter((e) => e.touchesAContract).map((e) => e.symbol)).toEqual(['ZEBR', 'ZEBR'])
  })

  it('keeps an undated row rather than dropping it, and gives it no distance', () => {
    const events = buildBookEvents({ rows, sharesBySymbol: shares, legSymbols: legs, today: TODAY })
    const undated = events.find((e) => e.symbol === 'NODT')
    expect(undated).toBeDefined()
    expect(undated?.daysAway).toBeNull()
    // It is in neither window: a row with no date cannot be said to be ahead or
    // behind, and putting it in one would be an invention.
    expect(upcoming(events).some((e) => e.symbol === 'NODT')).toBe(false)
    expect(recentHistory(events).some((e) => e.symbol === 'NODT')).toBe(false)
  })

  it('splits the two windows at today, with neither claiming the other’s rows', () => {
    const events = buildBookEvents({ rows, sharesBySymbol: shares, legSymbols: legs, today: TODAY })
    expect(upcoming(events).map((e) => e.exDate)).toEqual(['2026-09-25'])
    // 2026-03-02 is more than 90 days back, so the history window leaves it out.
    expect(recentHistory(events).map((e) => e.exDate)).toEqual(['2026-09-10'])
    expect(recentHistory(events, 365).map((e) => e.exDate)).toEqual(['2026-09-10', '2026-03-02'])
  })
})

describe('split arithmetic', () => {
  it('moves the strike down and the count up, by the same ratio', () => {
    // A 1 : 10 forward split: $1,200 becomes $120, and one contract becomes ten.
    expect(splitAdjustedStrike(1200, 1, 10)).toBeCloseTo(120)
    expect(splitAdjustedQty(-1, 1, 10)).toBeCloseTo(-10)
    // A reverse split runs the other way and stays consistent.
    expect(splitAdjustedStrike(5, 10, 1)).toBeCloseTo(50)
    expect(splitAdjustedQty(20, 10, 1)).toBeCloseTo(2)
  })

  it('refuses a ratio it cannot read rather than returning the unadjusted number', () => {
    // Returning the input would silently claim "the split changed nothing".
    expect(splitAdjustedStrike(100, null, 4)).toBeNull()
    expect(splitAdjustedStrike(100, 0, 4)).toBeNull()
    expect(splitAdjustedQty(1, 1, null)).toBeNull()
  })
})

describe('feedReach', () => {
  it('tells silence apart from a shallow backfill', () => {
    const reach = feedReach({
      bySymbol: new Map([
        ['ZEBR', rows.filter((r) => r.symbol === 'ZEBR')],
        ['QUOK', rows.filter((r) => r.symbol === 'QUOK')],
        ['HUSH', []],
      ]),
      today: TODAY,
    })
    expect(reach.asked).toBe(3)
    expect(reach.covered).toBe(2)
    // Nothing at all: the feed cannot say whether this name pays.
    expect(reach.silent).toEqual(['HUSH'])
    // Reached, but carrying a single row — a different fault, and one that
    // reads exactly like a name that has only ever paid once.
    expect(reach.shallow).toEqual(['QUOK'])
    expect(reach.rows).toBe(3)
    expect(reach.oldest).toBe('2026-03-02')
    expect(reach.newest).toBe('2026-09-25')
    expect(reach.ahead).toBe(1)
  })
})

describe('daysBetween', () => {
  it('counts whole days and signs them from today', () => {
    expect(daysBetween(TODAY, '2026-09-25')).toBe(8)
    expect(daysBetween(TODAY, '2026-09-10')).toBe(-7)
    expect(daysBetween(TODAY, 'not-a-date')).toBeNull()
  })
})

describe('sliceByUnderlying', () => {
  const legs = [
    { contractKey: 'a', label: 'ZEBR 18DEC26 90C', symbol: 'ZEBR', expiry: '20261218', strike: 90, right: 'C', qty: -16 },
    { contractKey: 'b', label: 'QUOK 16OCT26 40C', symbol: 'QUOK', expiry: '20261016', strike: 40, right: 'C', qty: -5 },
    { contractKey: 'c', label: 'QUOK 16OCT26 50C', symbol: 'QUOK', expiry: '20261016', strike: 50, right: 'C', qty: -4 },
    { contractKey: 'd', label: 'QUOK 20NOV26 30P', symbol: 'QUOK', expiry: '20261120', strike: 30, right: 'P', qty: 2 },
  ]

  it('rows an event’s subject by role, not one line per ticket', () => {
    const [first, second] = sliceByUnderlying({
      legs,
      sharesBySymbol: new Map([['ZEBR', 5200]]),
      coverBySymbol: new Map([['ZEBR', { backing: 3200, spare: 2000 }]]),
      eventBySymbol: new Map(),
    })
    // The nearest expiry leads: a leg that dies sooner leaves less room to act.
    expect(first.symbol).toBe('QUOK')
    expect(second.symbol).toBe('ZEBR')

    const shortCalls = first.roles.find((r) => r.role === 'Short calls')
    expect(shortCalls).toMatchObject({ contracts: 9, distinct: 2 })
    // Two strikes is not one contract, so there is no single token to print.
    expect(shortCalls?.label).toBeNull()
    expect(first.roles.map((r) => r.role)).toEqual(['Long puts', 'Short calls'])

    // One contract in the role: the token is the reading.
    expect(second.roles[0]).toMatchObject({ role: 'Short calls', contracts: 16, label: 'ZEBR 18DEC26 90C' })
    expect(second).toMatchObject({ shares: 5200, backing: 3200, spare: 2000 })
  })

  it('leaves backing null when Backing has no reading, rather than calling it zero', () => {
    // Zero would read as "nothing backs these calls", which is a judgement the
    // page has no basis for making.
    const [quok] = sliceByUnderlying({
      legs: legs.slice(1),
      sharesBySymbol: new Map(),
      coverBySymbol: new Map(),
      eventBySymbol: new Map(),
    })
    expect(quok.backing).toBeNull()
    expect(quok.spare).toBeNull()
    expect(quok.shares).toBe(0)
  })

  it('hands each name its own pending event and nothing else', () => {
    const events = buildBookEvents({
      rows,
      sharesBySymbol: shares,
      legSymbols: new Set(['ZEBR']),
      today: TODAY,
    })
    const split = upcoming(events)[0]
    const slices = sliceByUnderlying({
      legs,
      sharesBySymbol: shares,
      coverBySymbol: new Map(),
      eventBySymbol: new Map([[split.symbol, split]]),
    })
    expect(slices.find((s) => s.symbol === 'ZEBR')?.event?.exDate).toBe('2026-09-25')
    expect(slices.find((s) => s.symbol === 'QUOK')?.event).toBeNull()
  })
})
