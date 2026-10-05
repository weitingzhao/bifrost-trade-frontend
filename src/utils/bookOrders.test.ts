import { describe, expect, it } from 'vitest'
import type { OpenOrderRow } from '@/types/monitor'
import { orderContractName, workingOrderRows } from './bookOrders'

// Invented accounts and orders — not copied from any environment.
const HOST = 'U1000001'
const SEC = 'U2000002'
const NOW = 1_800_000_000

const ORDERS: OpenOrderRow[] = [
  {
    order_id: 11,
    perm_id: 9001,
    account_id: HOST,
    symbol: 'ACME',
    sec_type: 'OPT',
    action: 'SELL',
    total_quantity: 2,
    filled: 0,
    remaining: 2,
    limit_price: 1.45,
    status: 'Submitted',
    contract_key: 'ACME|OPT|20261120|120|P',
    updated_ts: NOW - 14 * 60,
  },
  {
    order_id: 12,
    perm_id: 9002,
    account_id: SEC,
    symbol: 'WIDG',
    sec_type: 'STK',
    action: 'BUY',
    total_quantity: 50,
    filled: 20,
    remaining: 30,
    limit_price: null,
    status: 'PreSubmitted',
    contract_key: 'WIDG|STK|||',
    updated_ts: NOW - 3 * 60,
  },
]

describe('working orders in the Account control (Rev .155)', () => {
  it('names an option the way the book rows do, a stock by its symbol', () => {
    expect(orderContractName(ORDERS[0]!)).toBe("ACME Nov 20'26 PUT 120")
    expect(orderContractName(ORDERS[1]!)).toBe('WIDG')
    expect(orderContractName({ symbol: 'ACME', sec_type: 'BAG', contract_key: 'ACME|BAG|||' })).toBe('ACME BAG')
  })

  it('counts every order under All and only the account under one', () => {
    expect(workingOrderRows(ORDERS, 'all', HOST, SEC, NOW)).toHaveLength(2)
    expect(workingOrderRows(ORDERS, 'HOST', HOST, SEC, NOW).map((r) => r.name)).toEqual(["ACME Nov 20'26 PUT 120"])
    expect(workingOrderRows(ORDERS, 'SEC', HOST, SEC, NOW).map((r) => r.name)).toEqual(['WIDG'])
  })

  it('reads side, IB status and account, and the limit', () => {
    const [opt, stk] = workingOrderRows(ORDERS, 'all', HOST, SEC, NOW)
    expect(opt!.sub).toBe('SELL 2 · Submitted · HOST')
    expect(opt!.price).toBe('LMT 1.45')
    // Remaining, not the original size; no limit price reads as a dash.
    expect(stk!.sub).toBe('BUY 30 · PreSubmitted · SEC')
    expect(stk!.price).toBe('—')
    expect(stk!.title).toContain('20 filled of 50')
  })

  it('does not dress the snapshot time up as how long the order has worked', () => {
    const [opt] = workingOrderRows(ORDERS, 'all', HOST, SEC, NOW)
    expect(opt!.sub).not.toMatch(/working|\d+m/)
    expect(opt!.title).toContain('IB snapshot 14m ago — when the order was placed is not stored')
  })

  it('keeps an order with no account under every scope, and reads nothing as nothing', () => {
    const loose: OpenOrderRow = { ...ORDERS[0]!, account_id: null }
    expect(workingOrderRows([loose], 'SEC', HOST, SEC, NOW)).toHaveLength(1)
    expect(workingOrderRows([loose], 'SEC', HOST, SEC, NOW)[0]!.sub).toContain('no account')
    expect(workingOrderRows(undefined, 'all', HOST, SEC, NOW)).toEqual([])
  })
})
