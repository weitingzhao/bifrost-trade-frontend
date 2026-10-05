import { describe, expect, it } from 'vitest'
import type { IbPositionRow } from '@/types/monitor'
import { bookExposures } from './eventsBookModel'

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
