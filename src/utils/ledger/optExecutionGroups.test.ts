import { describe, it, expect } from 'vitest'
import { buildOptExecutionGroups, isOptionExpired } from './optExecutionGroups'
import type { Execution } from '@/types/positions'

function makeExec(overrides: Partial<Execution>): Execution {
  return {
    account_executions_id: 1,
    account_id: 'U123',
    contract_key: 'NVDA|OPT|20260620|130|C',
    symbol: 'NVDA',
    sec_type: 'OPT',
    side: 'Buy',
    qty: 1,
    price: 5.0,
    time: 1700000000,
    ...overrides,
  }
}

describe('buildOptExecutionGroups', () => {
  it('returns empty array for no OPT executions', () => {
    const stk = makeExec({ sec_type: 'STK' })
    expect(buildOptExecutionGroups([stk])).toEqual([])
  })

  it('groups by contract_key and computes realized for closed position', () => {
    const buy = makeExec({ side: 'Buy', qty: 2, price: 3.0, commission: 1.3 })
    const sell = makeExec({ side: 'Sell', qty: 2, price: 5.0, commission: 1.3, time: 1700001000 })
    const groups = buildOptExecutionGroups([buy, sell])
    expect(groups).toHaveLength(1)
    const g = groups[0]
    expect(g.status).toBe('realized')
    expect(g.net_qty).toBeCloseTo(0, 5)
    expect(g.buy_volume).toBe(2)
    expect(g.sell_volume).toBe(2)
    // buy_cost = 3*2*100 + 1.3 = 601.3
    // sell_premium = 5*2*100 - 1.3 = 998.7
    // realized = 998.7 - 601.3 = 397.4
    expect(g.realized_pnl).toBeCloseTo(397.4, 1)
  })

  it('marks open position as unrealized', () => {
    const buy = makeExec({ side: 'Buy', qty: 3, price: 4.0 })
    const sell = makeExec({ side: 'Sell', qty: 1, price: 6.0 })
    const groups = buildOptExecutionGroups([buy, sell])
    expect(groups).toHaveLength(1)
    expect(groups[0].status).toBe('unrealized')
    expect(groups[0].net_qty).toBeCloseTo(2, 5)
  })

  it('handles both BUY/BOT/B and SELL/SLD/S side aliases', () => {
    const buy = makeExec({ side: 'BOT' as 'Buy', qty: 1, price: 2.0 })
    const sell = makeExec({ side: 'SLD' as 'Buy', qty: 1, price: 3.0, time: 1700001000 })
    const groups = buildOptExecutionGroups([buy, sell])
    expect(groups[0].status).toBe('realized')
  })

  it('separates different contracts into separate groups', () => {
    const buy1 = makeExec({ contract_key: 'NVDA|OPT|20260620|130|C', side: 'Buy' })
    const buy2 = makeExec({ contract_key: 'AAPL|OPT|20260620|200|P', symbol: 'AAPL', side: 'Buy' })
    const groups = buildOptExecutionGroups([buy1, buy2])
    expect(groups).toHaveLength(2)
  })

  it('filters out STK executions', () => {
    const opt = makeExec({ sec_type: 'OPT', side: 'Buy' })
    const stk = makeExec({ sec_type: 'STK', side: 'Buy' })
    const groups = buildOptExecutionGroups([opt, stk])
    expect(groups).toHaveLength(1)
  })
})

describe('isOptionExpired', () => {
  it('returns false for null/undefined', () => {
    expect(isOptionExpired(null)).toBe(false)
    expect(isOptionExpired(undefined)).toBe(false)
    expect(isOptionExpired('')).toBe(false)
  })

  it('returns true for past expiry (YYYYMMDD)', () => {
    expect(isOptionExpired('20200101')).toBe(true)
  })

  it('returns false for far future expiry', () => {
    expect(isOptionExpired('20991231')).toBe(false)
  })

  it('handles YYYYMM format', () => {
    expect(isOptionExpired('202001')).toBe(true)
  })

  it('handles dashes in expiry', () => {
    expect(isOptionExpired('2020-01-01')).toBe(true)
  })
})
