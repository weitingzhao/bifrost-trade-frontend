import { describe, expect, it } from 'vitest'
import type { ReviewInstance, ReviewLeg } from '@/utils/reviewInstances'
import { buildInstancePath } from './reviewInstancePath'

const leg = (key: string, fills: ReviewLeg['fills'], open = false): ReviewLeg =>
  ({ contractKey: key, fills, open, openedOn: fills[0]?.date ?? null }) as ReviewLeg
const f = (date: string, side: 'buy' | 'sell', qty: number, price: number) => ({
  date,
  side,
  qty,
  price,
  commission: 0,
  cash: side === 'buy' ? -price * qty * 100 : price * qty * 100,
})

describe('instance path — every leg on one line (Rev .104)', () => {
  // Sold A at 2.00, bought it back at 0.50 on the 5th (roll), sold B at 1.00, bought B back at 0.20 on the 9th.
  const inst = {
    openedOn: '2026-01-02',
    closedOn: '2026-01-09',
    legs: [
      leg('A', [f('2026-01-02', 'sell', 1, 2), f('2026-01-05', 'buy', 1, 0.5)]),
      leg('B', [f('2026-01-05', 'sell', 1, 1), f('2026-01-09', 'buy', 1, 0.2)]),
    ],
  } as Pick<ReviewInstance, 'legs' | 'openedOn' | 'closedOn'>
  const bars = new Map([
    ['A', [{ date: '2026-01-02', close: 2 }, { date: '2026-01-05', close: 0.5 }] as never],
    ['B', [{ date: '2026-01-05', close: 1 }, { date: '2026-01-07', close: 0.6 }] as never],
  ])

  it('sums the legs, marks the open one, and lands on the realised cash at the close', () => {
    const p = buildInstancePath(inst, bars, '2026-02-01')!
    expect(p.held.map((x) => [x.date, Math.round(x.pl)])).toEqual([
      ['2026-01-02', 0],
      ['2026-01-05', 150],
      ['2026-01-07', 190],
      ['2026-01-09', 230],
    ])
    expect(p.realised).toBe(230)
    expect(p.best).toBe(230)
  })

  it('ends an open instance at today’s marks and skips days an open leg was never marked', () => {
    const open = { ...inst, closedOn: null, legs: [inst.legs[0], leg('B', [f('2026-01-05', 'sell', 1, 1)], true)] }
    const p = buildInstancePath(open, bars, '2026-01-08')!
    expect(p.held.map((x) => x.date)).toEqual(['2026-01-02', '2026-01-05', '2026-01-07'])
    expect(Math.round(p.realised)).toBe(190)
  })
})
