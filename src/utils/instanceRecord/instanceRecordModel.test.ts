import { describe, expect, it } from 'vitest'
import type { Execution } from '@/types/positions'
import { d3, execGroupsOf, heldLegs, legsOf, lifeOf, payoffOf, twsRowsFor } from './instanceRecordModel'

// Invented fixtures — never copied from a live book.
const CK_CLOSED = 'ZZTM  270115P00100000|OPT|20270115|100|P'
const CK_OPEN = 'ZZTM  270219C00150000|OPT|20270219|150|C'
let n = 0
const fill = (
  ck: string,
  side: 'Buy' | 'Sell',
  qty: number,
  price: number,
  day: string,
  commission = 1,
): Execution =>
  ({
    account_executions_id: ++n,
    account_id: 'UPROBE',
    contract_key: ck,
    symbol: ck.split('|')[0],
    sec_type: 'OPT',
    side,
    quantity: qty,
    price,
    commission,
    trade_date: day,
    time: Date.parse(`${day}T15:00:00Z`) / 1000,
    expiry: ck.split('|')[2],
    strike: Number(ck.split('|')[3]),
    option_right: ck.split('|')[4],
  }) as unknown as Execution

const CLOSED = [fill(CK_CLOSED, 'Sell', 2, 3.0, '2026-10-01'), fill(CK_CLOSED, 'Buy', 2, 1.0, '2026-10-20')]
const OPEN = [fill(CK_OPEN, 'Sell', 1, 4.0, '2026-11-02')]

describe('legs from the fills', () => {
  it('a flat short leg: entry is the sell average, exit the buy-back, P&L realised with fees', () => {
    const [leg] = legsOf(CLOSED, {})
    expect(leg).toMatchObject({ side: 'Short', qty: 2, entry: 3, exit: 1, exitKind: 'exit', open: false })
    // (3.00 − 1.00) × 2 × 100 − 2 fees
    expect(leg.pnl).toBe(398)
    expect(leg.label).toBe('ZZTM 15JAN27 100P')
  })

  it('an open leg is marked only when a mark exists, and says where it came from', () => {
    const [unmarked] = legsOf(OPEN, {})
    expect(unmarked).toMatchObject({ open: true, exit: null, exitKind: 'none', pnl: null })
    const [marked] = legsOf(OPEN, { [CK_OPEN]: { price: 1.5, source: 'eod', asOf: '2026-11-20' } })
    // 4.00 × 100 − 1 fee in, less 1.50 × 100 still owed
    expect(marked.pnl).toBe(249)
    expect(marked.mark?.asOf).toBe('2026-11-20')
  })
})

describe('life', () => {
  it('closed runs to its last fill; open runs to the latest open expiry', () => {
    expect(lifeOf(CLOSED, legsOf(CLOSED, {}), '2026-12-01')).toMatchObject({
      from: '2026-10-01',
      to: '2026-10-20',
      closed: true,
      totalDays: 19,
      elapsed: 19,
    })
    const open = lifeOf(OPEN, legsOf(OPEN, {}), '2026-11-12')
    expect(open).toMatchObject({ from: '2026-11-02', to: '2027-02-19', closed: false, elapsed: 10, expired: false })
  })
})

describe('payoff as held', () => {
  it('a short put breaks even at strike minus credit, capped gain, loss to zero', () => {
    const p = payoffOf(legsOf(CLOSED, {}), null, 100, 200)!
    expect(p.breakevens).toHaveLength(1)
    expect(p.breakevens[0]).toBeCloseTo(97, 0)
    expect(p.maxGain.total).toBeCloseTo(600, 0)
    expect(p.lossUnbounded).toBe(false)
    expect(p.credit).toBe(600)
  })

  it('an uncovered short call has an unbounded loss; shares cover it', () => {
    expect(payoffOf(legsOf(OPEN, {}), null, 140)!.lossUnbounded).toBe(true)
    expect(payoffOf(legsOf(OPEN, {}), { qty: 100, avgCost: 130 }, 140)!.lossUnbounded).toBe(false)
  })
})

describe('executions', () => {
  it('pairs buys beside sells per contract, gross before fees', () => {
    const [g] = execGroupsOf(legsOf(CLOSED, {}))
    expect(g.sides.map((s) => [s.name, s.qty, s.avg])).toEqual([
      ['Buy', 2, 1],
      ['Sell', 2, 3],
    ])
    expect([g.gross, g.comm, g.net]).toEqual([400, 2, 398])
  })

  it('matches TWS rows by the contracts the instance traded', () => {
    const other = fill('QQXX  270115C00050000|OPT|20270115|50|C', 'Buy', 1, 1, '2026-10-01')
    const rows = twsRowsFor([...CLOSED, other], new Set([CK_CLOSED]))
    expect(rows).toHaveLength(2)
  })

  it('formats an expiry the way the ledger does', () => {
    expect(d3('2027-01-15')).toBe('15JAN27')
    expect(d3(null)).toBe('—')
  })
})

describe('as held (Rules walk 2026-09-28)', () => {
  it('an open instance draws its open legs at their open size — flat legs and closed parts carry no risk', () => {
    const partial = [
      fill(CK_OPEN, 'Sell', 5, 4.0, '2026-11-02'),
      fill(CK_OPEN, 'Buy', 2, 2.0, '2026-11-10'),
      ...CLOSED, // a leg already flat inside the same instance
    ]
    const held = heldLegs(legsOf(partial, {}))
    expect(held.map((h) => [h.leg.key, h.qty])).toEqual([[CK_OPEN, 3]])
    // credit counts the 3 still open, not the 5 once sold
    expect(payoffOf(legsOf(partial, {}), null, 140)!.credit).toBe(1200)
  })

  it('a closed instance draws every leg at its largest size', () => {
    const held = heldLegs(legsOf(CLOSED, {}))
    expect(held.map((h) => h.qty)).toEqual([2])
  })
})
