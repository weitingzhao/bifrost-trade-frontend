import { describe, expect, it } from 'vitest'
import type { Execution } from '@/types/positions'
import { buildStkTotals } from './stkTotals'

const ACCT = 'U0000001'
const CK = 'ZQX|STK|||'

function fill(id: number, qty: number, price: number, realized: number, pending = false): Execution {
  return {
    account_executions_id: id, exec_id: `e.${id}`, account_id: ACCT, symbol: 'ZQX', sec_type: 'STK',
    side: qty < 0 ? 'SELL' : 'BUY', quantity: qty, price, realized_pnl: realized, contract_key: CK,
    ...(pending ? { pending: true } : {}),
  } as Execution
}

describe('buildStkTotals', () => {
  it('counts, sums notional and realized over the confirmed fills only', () => {
    const totals = buildStkTotals(
      [fill(1, 100, 10, 0), fill(2, -40, 12, 80), fill(-3, -60, 11, 55, true)],
      new Map(),
    )
    expect(totals.count).toBe(2)
    expect(totals.notional).toBe(100 * 10 + 40 * 12)
    expect(totals.realized).toBe(80)
    expect(totals.unrealized).toBeNull()
  })

  it("reads unrealized from IB's snapshot once per account and contract, pending or not", () => {
    const totals = buildStkTotals(
      [fill(-3, -60, 11, 55, true), fill(1, 100, 10, 0)],
      new Map([[`${ACCT}|${CK}`, 25]]),
    )
    expect(totals.unrealized).toBe(25)
  })

  it('is all zero when every fill is pending', () => {
    const totals = buildStkTotals([fill(-3, -60, 11, 55, true)], new Map())
    expect(totals).toEqual({ count: 0, notional: 0, realized: 0, unrealized: null })
  })
})
