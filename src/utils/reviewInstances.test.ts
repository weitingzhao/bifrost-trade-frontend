import { describe, expect, it } from 'vitest'
import type { Execution } from '@/types/positions'
import { buildReviewInstances, serverStatesOf } from './reviewInstances'
import type { StrategyInstance } from '@/types/strategy'

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
    ex({ contract_key: A, side: 'Sell', quantity: 1, price: 2, trade_date: '2026-01-02', strike: 50, option_right: 'P', expiry: '20260116', strategy_instance_id: 7, strategy_opportunity_name: 'Wheel' }),
    ex({ contract_key: A, side: 'Buy', quantity: 1, price: 0.5, trade_date: '2026-01-10', strike: 50, option_right: 'P', expiry: '20260116', strategy_instance_id: 7 }),
    ex({ contract_key: B, side: 'Sell', quantity: 1, price: 1.5, trade_date: '2026-01-10', strike: 48, option_right: 'P', expiry: '20260220', strategy_instance_id: 7 }),
    ex({ contract_key: B, side: 'Buy', quantity: 1, price: 0.2, trade_date: '2026-02-01', strike: 48, option_right: 'P', expiry: '20260220', strategy_instance_id: 7 }),
    // Instance 8: still open.
    ex({ contract_key: C, symbol: 'YYY', side: 'Sell', quantity: 2, price: 1, trade_date: '2026-01-05', strike: 20, option_right: 'C', expiry: '20260116', strategy_instance_id: 8 }),
  ]

  it('reads an instance as one line across its legs, and pins open ones first', () => {
    const list = buildReviewInstances(rows, '2026-01-08')
    expect(list.map((i) => [i.tradeId, i.open, i.legs.length, i.rolls])).toEqual([
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
    const eight = list.find((i) => i.tradeId === 8)!
    expect([eight.open, eight.exitKind, eight.closedOn, eight.expiredUnbooked]).toEqual([false, 'expired', '2026-01-16', true])
    expect(Math.round(eight.realised)).toBe(200)
  })

  it('reads open / closed from the instance list when it has a state (core 0.41.0, TD-43)', () => {
    const states = serverStatesOf([
      { strategy_instance_id: 8, state: 'expired', closed_on: '2026-01-16' },
      { strategy_instance_id: 7, state: 'closed', closed_on: '2026-02-01' },
      { strategy_instance_id: 9 },
    ] as unknown as StrategyInstance[])
    expect([...states.keys()]).toEqual([8, 7])
    // On 2026-01-08 the legs alone say 8 is open; the server's state wins.
    const list = buildReviewInstances(rows, '2026-01-08', undefined, states)
    const eight = list.find((i) => i.tradeId === 8)!
    expect([eight.open, eight.exitKind, eight.closedOn, eight.expiredUnbooked]).toEqual([false, 'expired', '2026-01-16', true])
    expect(list.find((i) => i.tradeId === 7)!.closedOn).toBe('2026-02-01')
  })

  it('keeps the legs reading when the server state is no_fills or missing', () => {
    const states = serverStatesOf([{ strategy_instance_id: 8, state: 'no_fills', closed_on: null }] as unknown as StrategyInstance[])
    const list = buildReviewInstances(rows, '2026-01-08', undefined, states)
    expect(list.find((i) => i.tradeId === 8)!.open).toBe(true)
  })
})

describe('how a trade ended (Rev .112)', () => {
  const D = 'QQQQ  260116C00030000|OPT|20260116|30.0|C'
  const call = (over: Partial<Execution>) =>
    ex({ contract_key: D, symbol: 'QQQQ', strike: 30, option_right: 'C', expiry: '20260116', quantity: 1, ...over })

  it('reads a broker booking with the stock delivered at the strike that day as assigned', () => {
    const rows = [
      call({ side: 'Sell', price: 1, trade_date: '2026-01-02', strategy_instance_id: 11 }),
      call({ side: 'Buy', price: 0, trade_date: '2026-01-16', transaction_type: 'BookTrade', strategy_instance_id: 11 }),
      ex({ sec_type: 'STK', symbol: 'QQQQ', side: 'Sell', quantity: 100, price: 30, trade_date: '2026-01-16', transaction_type: 'BookTrade' }),
    ]
    expect(buildReviewInstances(rows, '2026-02-01')[0].exitKind).toBe('assigned')
  })

  it('reads a broker booking with no delivery as expired', () => {
    const rows = [
      call({ side: 'Sell', price: 1, trade_date: '2026-01-02', strategy_instance_id: 12 }),
      call({ side: 'Buy', price: 0, trade_date: '2026-01-16', transaction_type: 'BookTrade', strategy_instance_id: 12 }),
    ]
    expect(buildReviewInstances(rows, '2026-02-01')[0].exitKind).toBe('expired')
  })

  it('reads a credit bought back for more than twice what came in as a stop', () => {
    const rows = [
      call({ side: 'Sell', price: 1, trade_date: '2026-01-02', strategy_instance_id: 13 }),
      call({ side: 'Buy', price: 2.5, trade_date: '2026-01-09', transaction_type: 'ExchTrade', strategy_instance_id: 13 }),
    ]
    expect(buildReviewInstances(rows, '2026-02-01')[0].exitKind).toBe('stop')
  })

  it('reads the exit against a plan’s date: early, late, or on plan within three days', () => {
    const rows = [
      call({ side: 'Sell', price: 1, trade_date: '2026-01-02', strategy_instance_id: 14 }),
      call({ side: 'Buy', price: 0.4, trade_date: '2026-01-09', transaction_type: 'ExchTrade', strategy_instance_id: 14 }),
    ]
    const kind = (exitBy: string | null) => buildReviewInstances(rows, '2026-02-01', new Map([[14, exitBy]]))[0].exitKind
    expect(kind('2026-01-14')).toBe('early')
    expect(kind('2026-01-05')).toBe('late')
    expect(kind('2026-01-11')).toBe('closed')
    expect(kind(null)).toBe('closed')
  })
})
