import { describe, expect, it } from 'vitest'
import type { Execution } from '@/types/positions'
import { buildReviewInstances } from './reviewInstances'

// Invented contracts and prices (fixtures are never copied from DEV).
const ex = (over: Partial<Execution>): Execution =>
  ({
    account_id: 'U0000001',
    sec_type: 'OPT',
    symbol: 'ZZZ',
    commission: 0,
    strategy_instance_id: null,
    ...over,
  }) as Execution

const A = 'ZZZ   260116P00050000|OPT|20260116|50.0|P'
const B = 'ZZZ   260220P00048000|OPT|20260220|48.0|P'
const C = 'YYY   260116C00020000|OPT|20260116|20.0|C'

describe('review instances (Rev .104)', () => {
  const rows = [
    // Instance 7: sold A, bought it back, rolled into B, bought B back — one line, one roll.
    ex({ contract_key: A, side: 'Sell', qty: 1, quantity: 1, price: 2, trade_date: '2026-01-02', strike: 50, right: 'P', expiry: '20260116', strategy_instance_id: 7, strategy_opportunity_name: 'Wheel' }),
    ex({ contract_key: A, side: 'Buy', qty: 1, quantity: 1, price: 0.5, trade_date: '2026-01-10', strike: 50, right: 'P', expiry: '20260116', strategy_instance_id: 7 }),
    ex({ contract_key: B, side: 'Sell', qty: 1, quantity: 1, price: 1.5, trade_date: '2026-01-10', strike: 48, right: 'P', expiry: '20260220', strategy_instance_id: 7 }),
    ex({ contract_key: B, side: 'Buy', qty: 1, quantity: 1, price: 0.2, trade_date: '2026-02-01', strike: 48, right: 'P', expiry: '20260220', strategy_instance_id: 7 }),
    // Instance 8: still open.
    ex({ contract_key: C, symbol: 'YYY', side: 'Sell', qty: 2, quantity: 2, price: 1, trade_date: '2026-01-05', strike: 20, right: 'C', expiry: '20260116', strategy_instance_id: 8 }),
  ]

  it('reads an instance as one line across its legs, and pins open ones first', () => {
    const list = buildReviewInstances(rows, '2026-01-08')
    expect(list.map((i) => [i.instanceId, i.open, i.legs.length, i.rolls])).toEqual([
      [8, true, 1, 0],
      [7, false, 2, 1],
    ])
    const seven = list[1]
    expect(Math.round(seven.realised)).toBe(280)
    expect(seven.label).toMatch(/\+1$/)
    expect(seven.closedOn).toBe('2026-02-01')
    expect(seven.play).toBe('Wheel')
    expect(list[0].exitKind).toBe('open')
  })

  it('reads an instance whose open legs are all past expiry as expired, not open', () => {
    const list = buildReviewInstances(rows, '2026-03-01')
    const eight = list.find((i) => i.instanceId === 8)!
    expect([eight.open, eight.exitKind, eight.closedOn, eight.expiredUnbooked]).toEqual([false, 'expired', '2026-01-16', true])
    expect(Math.round(eight.realised)).toBe(200)
  })
})
