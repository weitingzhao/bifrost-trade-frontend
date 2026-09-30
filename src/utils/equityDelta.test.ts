import { describe, expect, it } from 'vitest'
import { equityDeltaOf, equityDeltaRollup, noEquityDeltaKeys } from './equityDelta'

// Invented holdings (fixtures are never copied from DEV).
const accounts = [
  {
    account_id: 'U0000001',
    positions: [
      { secType: 'STK', symbol: 'aaa', category: 'Core' },
      { secType: 'STK', symbol: 'FIX', category: 'Fix Income' },
      { secType: 'STK', symbol: 'TBL', category: 'Cash' },
      { secType: 'OPT', symbol: 'FIX', category: 'Fix Income' },
    ],
  },
  { account_id: 'U0000002', positions: [{ secType: 'STK', symbol: 'FIX', category: 'Core' }] },
]

describe('equity delta — stocks + options (Rev .119)', () => {
  const keys = noEquityDeltaKeys(accounts)

  it('keys fixed-income and cash-like stock per account × symbol', () => {
    expect([...keys].sort()).toEqual(['U0000001|FIX', 'U0000001|TBL'])
  })

  it('takes the fund’s shares out and keeps an option written on it', () => {
    // 200 shares plus a short call worth −30 share equivalents.
    const fix = { symbol: 'FIX', stock_qty: 200, spot: 20, greeks: { delta: 170, delta_dollars: 3400 } }
    expect(equityDeltaOf(fix, 'U0000001', keys)).toEqual({ delta: -30, dollars: -600 })
    // Tagged Core in the other account: counted as a stock there.
    expect(equityDeltaOf(fix, 'U0000002', keys)).toEqual({ delta: 170, dollars: 3400 })
  })

  it('rolls an account up on the same basis, and leaves a missing figure missing', () => {
    const per = [
      { symbol: 'AAA', stock_qty: 100, spot: 10, greeks: {} },
      { symbol: 'FIX', stock_qty: 200, spot: 20, greeks: {} },
      { symbol: 'TBL', stock_qty: 50, spot: null, greeks: {} },
    ]
    expect(equityDeltaRollup(per, 'U0000001', keys, { delta: 400, dollars: 9000 })).toEqual({ delta: 150, dollars: 5000 })
    expect(equityDeltaRollup(per, 'U0000001', keys, { delta: null, dollars: null })).toEqual({ delta: null, dollars: null })
  })
})
