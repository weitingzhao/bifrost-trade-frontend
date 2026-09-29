import { describe, expect, it } from 'vitest'
import type { Execution } from '@/types/positions'
import { execGroupsOf, legsOf } from '@/utils/tradeRecord/tradeRecordModel'
import { fillRows, ledgerRows, sourceLabel, timelineRows } from './tradePageModel'

// Invented fixtures — never copied from a live book.
const A = 'ZZTM  270115C00100000|OPT|20270115|100|C'
const B = 'ZZTM  270219C00095000|OPT|20270219|95|C'
let n = 0
const fill = (ck: string, side: 'BUY' | 'SELL', qty: number, price: number, day: string, extra: Partial<Execution> = {}): Execution =>
  ({
    account_executions_id: ++n,
    contract_key: ck,
    symbol: ck.split('|')[0],
    sec_type: 'OPT',
    side,
    quantity: qty,
    price,
    commission: 1,
    trade_date: day,
    time: Date.parse(`${day}T15:00:00Z`) / 1000 + n,
    expiry: ck.split('|')[2],
    strike: Number(ck.split('|')[3]),
    option_right: 'C',
    source: 'flex_trades',
    ...extra,
  }) as unknown as Execution

// Sold 100C, rolled on 11-10 into the 95C, which is still open.
const FILLS = [
  fill(A, 'SELL', 2, 3.0, '2026-10-01'),
  fill(A, 'BUY', 2, 1.0, '2026-11-10'),
  fill(B, 'SELL', 2, 2.5, '2026-11-10'),
]
const JOINT = [{ date: '2026-11-10', fromStrike: 100, toStrike: 95, net: 300 }]

describe('fills', () => {
  it('lists every fill in time order, cash from IB where it gave one', () => {
    const f = fillRows(
      [...FILLS, fill(B, 'SELL', 1, 2.0, '2026-11-12', { net_cash: 199.1 } as Partial<Execution>)],
      (ck) => ck.slice(0, 4),
      '2026-11-20',
    )
    expect(f.rows.map((r) => [r.side, r.qty, r.source])).toEqual([
      ['SLD', 2, 'Flex'],
      ['BOT', 2, 'Flex'],
      ['SLD', 2, 'Flex'],
      ['SLD', 1, 'Flex'],
    ])
    // 3.00 × 2 × 100 in, less the fee.
    expect(f.rows[0].cash).toBe(599)
    expect(f.rows[3].cash).toBe(199.1)
    expect(f.comm).toBe(4)
  })

  it('names where a fill came from', () => {
    expect(sourceLabel('journal_closed', '2026-11-01', '2026-11-20')).toBe('Book event')
    expect(sourceLabel('tws', '2026-11-20', '2026-11-20')).toBe('TWS · today')
  })
})

describe('ledger by leg', () => {
  it('a rolled leg is realised at its buy-back; the open one is unrealized at its mark', () => {
    const legs = legsOf(FILLS, { [B]: { price: 1.5, source: 'eod', asOf: '2026-11-19' } })
    const l = ledgerRows(legs, execGroupsOf(legs), JOINT)
    expect(l.rows.map((r) => [r.label, r.closed, r.qty, r.realised])).toEqual([
      ['ZZTM 15JAN27 100C', '10NOV26 · rolled', '−2', true],
      ['ZZTM 19FEB27 95C', 'open', '−2', false],
    ])
    // (3.00 − 1.00) × 200 − 2 fees
    expect(l.realised).toBe(398)
    // 2.50 × 200 − 1 fee in, less 1.50 × 200 still owed
    expect(l.unrealized).toBe(199)
  })
})

describe('an expiry is not a buy-back', () => {
  it('a leg closed at zero reads expired', () => {
    const legs = legsOf([fill(A, 'SELL', 1, 2.0, '2026-10-01'), fill(A, 'BUY', 1, 0, '2027-01-15')], {})
    expect(ledgerRows(legs, execGroupsOf(legs), []).rows[0].closed).toBe('15JAN27 · expired')
  })
})

describe('timeline', () => {
  it('runs from the first fill to the open expiry, the roll seam marked', () => {
    const legs = legsOf(FILLS, {})
    const t = timelineRows(legs, JOINT, '2026-11-20')
    expect([t.from, t.to]).toEqual(['2026-10-01', '2027-02-19'])
    expect(t.rows[0].marks.map((m) => m.glyph)).toEqual(['●', '↻'])
    expect(t.rows[1].segs.map((s) => s.kind)).toEqual(['held', 'toExpiry'])
    expect(t.rows[1].side).toContain('↻ +$300 net credit')
    expect(t.todayAt).not.toBeNull()
  })
})
