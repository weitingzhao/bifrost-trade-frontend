import { describe, expect, it } from 'vitest'
import { deltaShortNote, equityDeltaOf, equityDeltaRollup, markDeltaShort, noEquityDeltaKeys } from './equityDelta'

// Invented holdings (fixtures are never copied from DEV).
const accounts = [
  {
    account_id: 'U0000001',
    positions: [
      { secType: 'STK', symbol: 'aaa', category: 'Core' },
      { secType: 'STK', symbol: 'FIX', category: 'Core', instrument_class: 'fixed_income' },
      { secType: 'STK', symbol: 'TBL', category: 'Fix Income', instrument_class: 'cash_like' },
      { secType: 'OPT', symbol: 'FIX', category: 'Fix Income' },
      // A category alone makes nothing fixed income (Rev .119).
      { secType: 'STK', symbol: 'BND', category: 'Fix Income' },
    ],
  },
  // The class is the instrument's: the same fund reads the same in every account.
  { account_id: 'U0000002', positions: [{ secType: 'STK', symbol: 'FIX', category: 'Core', instrument_class: 'fixed_income' }] },
]

describe('equity delta — stocks + options (Rev .119)', () => {
  const keys = noEquityDeltaKeys(accounts)

  it('keys registered fixed-income and cash-like stock per account × symbol', () => {
    expect([...keys].sort()).toEqual(['U0000001|FIX', 'U0000001|TBL', 'U0000002|FIX'])
  })

  it('takes the fund’s shares out and keeps an option written on it', () => {
    // 200 shares plus a short call worth −30 share equivalents.
    const fix = { symbol: 'FIX', stock_qty: 200, spot: 20, greeks: { delta: 170, delta_dollars: 3400 } }
    expect(equityDeltaOf(fix, 'U0000001', keys)).toEqual({ delta: -30, dollars: -600 })
    expect(equityDeltaOf(fix, 'U0000002', keys)).toEqual({ delta: -30, dollars: -600 })
    // Not held as a registered fund in that account: counted as it stands.
    expect(equityDeltaOf({ ...fix, symbol: 'AAA' }, 'U0000001', keys)).toEqual({ delta: 170, dollars: 3400 })
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

describe('a Δ short of its option legs (TD-260)', () => {
  it('is marked +? and never left looking whole', () => {
    expect(markDeltaShort('+120', 1)).toBe('+120+?')
    expect(markDeltaShort('+120', 0)).toBe('+120')
    expect(markDeltaShort('—', 3)).toBe('—')
  })
  it('names how many underlyings are short and why', () => {
    expect(deltaShortNote(1)).toBe('1 underlying without option-leg delta — no option quote is served')
    expect(deltaShortNote(4)).toContain('4 underlyings')
  })
})
