import { describe, expect, it } from 'vitest'
import type { IbPositionRow } from '@/types/monitor'
import { bookExposures, earningsLanes } from './eventsBookModel'

function opt(symbol: string, expiry: string, position: number, strike: number, right: 'C' | 'P'): IbPositionRow {
  return { symbol, secType: 'OPT', expiry, position, strike, right } as IbPositionRow
}

describe('bookExposures', () => {
  const accounts = [
    {
      positions: [
        opt('ZZZ', '20261218', -2, 40, 'P'),
        opt('YYY', '20261120', 1, 90, 'C'),
        { symbol: 'ZZZ', secType: 'STK', position: 100 } as IbPositionRow,
        opt('ZZZ', '20261120', -1, 38, 'P'),
      ],
    },
    { positions: [opt('ZZZ', '20261218', -1, 38, 'P'), opt('XXX', '20261218', 0, 10, 'C')] },
  ]

  it('is one row per name and expiry, nearest first, names in book order within a date', () => {
    const rows = bookExposures(accounts, '2026-10-04', ['2026-11-20', '2026-12-18'])
    expect(rows.map((r) => `${r.sym} ${r.expiry}`)).toEqual(['YYY 2026-11-20', 'ZZZ 2026-11-20', 'ZZZ 2026-12-18'])
  })

  it('joins the legs of one name across accounts and leaves closed legs out', () => {
    const rows = bookExposures(accounts, '2026-10-04', [])
    const zzzDec = rows.find((r) => r.sym === 'ZZZ' && r.expiry === '2026-12-18')
    expect(zzzDec?.legs).toBe('−2 40P · −1 38P')
    expect(rows.some((r) => r.sym === 'XXX')).toBe(false)
  })

  it('counts days from today and marks OPEX', () => {
    const rows = bookExposures(accounts, '2026-10-04', ['2026-11-20'])
    expect(rows[0]).toMatchObject({ inDays: 47, isOpex: true })
    expect(rows[2]).toMatchObject({ inDays: 75, isOpex: false })
  })
})

describe('earningsLanes', () => {
  const expected = (date: string, daysAway: number) => ({
    kind: 'expected' as const,
    next: { date, daysAway, track: { n: 4, medianMissDays: 1, maxMissDays: 2 }, lastResult: null },
  })
  const none = (code: 'no_filings' | 'too_few_results') => ({
    kind: 'none' as const,
    reason: 'x',
    absence: { code, text: 'x' },
  })
  const window = ['2026-10-05', '2026-10-06', '2026-10-07']

  it('places book and watchlist estimates on their own lanes, inside the window only', () => {
    const lanes = earningsLanes(
      { book: ['AAA', 'BBB'], watch: ['CCC', 'DDD'] },
      {
        AAA: expected('2026-10-06', 2),
        BBB: expected('2026-11-02', 29),
        CCC: expected('2026-10-06', 2),
        DDD: expected('2026-10-06', 2),
      },
      window,
    )
    expect([...lanes.book.byDate.keys()]).toEqual(['2026-10-06'])
    expect(lanes.book.byDate.get('2026-10-06')?.map((m) => m.sym)).toEqual(['AAA'])
    expect(lanes.watch.byDate.get('2026-10-06')?.map((m) => m.sym)).toEqual(['CCC', 'DDD'])
    expect(lanes.book.byDate.get('2026-10-06')?.[0].title).toContain('(est.)')
  })

  it('names the next print past the window, and leaves a late print off the lanes', () => {
    const lanes = earningsLanes(
      { book: ['AAA', 'BBB'], watch: [] },
      { AAA: expected('2026-12-01', 57), BBB: expected('2026-09-30', -5) },
      window,
    )
    expect(lanes.book.byDate.size).toBe(0)
    expect(lanes.book.nextBeyond?.sym).toBe('AAA')
  })

  it('counts what was read and groups the names with no estimate by why', () => {
    const lanes = earningsLanes(
      { book: ['AAA', 'EEE'], watch: ['FFF', 'GGG', 'HHH'] },
      { AAA: expected('2026-10-06', 2), EEE: none('no_filings'), FFF: none('no_filings'), GGG: none('too_few_results') },
      window,
    )
    expect(lanes).toMatchObject({ estimated: 1, read: 4, pending: 1 })
    expect(lanes.absent).toEqual([
      { code: 'no_filings', label: expect.stringContaining('ETF'), names: ['EEE', 'FFF'] },
      { code: 'too_few_results', label: expect.stringContaining('listed recently'), names: ['GGG'] },
    ])
  })
})
