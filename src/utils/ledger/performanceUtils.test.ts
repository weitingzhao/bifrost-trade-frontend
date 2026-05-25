import { describe, it, expect } from 'vitest'
import {
  optionRightToFull,
  normalizeStrike,
  executionDateStr,
  getTimeRangeDates,
  listDateStrings,
  listMonthKeysInRange,
  computeOptPairsFromExecutions,
  dateStrMinusDays,
} from './performanceUtils'
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

describe('optionRightToFull', () => {
  it('converts C to CALL', () => expect(optionRightToFull('C')).toBe('CALL'))
  it('converts P to PUT', () => expect(optionRightToFull('P')).toBe('PUT'))
  it('converts CALL to CALL', () => expect(optionRightToFull('CALL')).toBe('CALL'))
  it('returns dash for null', () => expect(optionRightToFull(null)).toBe('—'))
})

describe('normalizeStrike', () => {
  it('converts number to string', () => expect(normalizeStrike(130)).toBe('130'))
  it('handles float', () => expect(normalizeStrike(130.5)).toBe('130.5'))
  it('returns dash for null', () => expect(normalizeStrike(null)).toBe('—'))
})

describe('executionDateStr', () => {
  it('prefers trade_date', () => {
    const e = makeExec({ trade_date: '2024-03-15' })
    expect(executionDateStr(e)).toBe('2024-03-15')
  })

  it('falls back to time (Chicago)', () => {
    const e = makeExec({ trade_date: null, time: 1700000000 })
    const result = executionDateStr(e)
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('returns dash for no date info', () => {
    const e = makeExec({ trade_date: null, time: null })
    expect(executionDateStr(e)).toBe('—')
  })
})

describe('dateStrMinusDays', () => {
  it('subtracts days', () => {
    expect(dateStrMinusDays('2024-03-15', 5)).toBe('2024-03-10')
  })

  it('handles month boundary', () => {
    expect(dateStrMinusDays('2024-03-02', 5)).toBe('2024-02-26')
  })
})

describe('getTimeRangeDates', () => {
  it('computes quarter range', () => {
    const { sinceStr, untilStr } = getTimeRangeDates('quarter', '2024-06')
    expect(sinceStr).toBe('2024-04-01')
    expect(untilStr).toBe('2024-06-30')
  })

  it('computes year range', () => {
    const { sinceStr, untilStr } = getTimeRangeDates('year', '2024-12')
    expect(sinceStr).toBe('2024-01-01')
    expect(untilStr).toBe('2024-12-31')
  })
})

describe('listDateStrings', () => {
  it('lists all dates in range', () => {
    const dates = listDateStrings('2024-03-28', '2024-04-02')
    expect(dates).toEqual([
      '2024-03-28',
      '2024-03-29',
      '2024-03-30',
      '2024-03-31',
      '2024-04-01',
      '2024-04-02',
    ])
  })
})

describe('listMonthKeysInRange', () => {
  it('lists months', () => {
    const months = listMonthKeysInRange('2024-10-01', '2025-02-28')
    expect(months).toEqual(['2024-10', '2024-11', '2024-12', '2025-01', '2025-02'])
  })
})

describe('computeOptPairsFromExecutions', () => {
  it('returns empty for no OPT executions', () => {
    const stk = makeExec({ sec_type: 'STK' })
    expect(computeOptPairsFromExecutions([stk])).toEqual([])
  })

  it('pairs matching buy and sell', () => {
    const buy = makeExec({
      account_executions_id: 1,
      side: 'Buy',
      qty: 2,
      price: 3.0,
      commission: 1.0,
      expiry: '20260620',
      strike: 130,
    })
    const sell = makeExec({
      account_executions_id: 2,
      side: 'Sell',
      qty: 2,
      price: 5.0,
      commission: 1.0,
      expiry: '20260620',
      strike: 130,
      time: 1700001000,
    })
    const pairs = computeOptPairsFromExecutions([buy, sell])
    expect(pairs).toHaveLength(1)
    expect(pairs[0].qty).toBe(2)
    // net_pnl = (-2*3*100 - 1) + (2*5*100 - 1) = -601 + 999 = 398
    expect(pairs[0].net_pnl).toBeCloseTo(398, 0)
  })

  it('handles partial matches', () => {
    const buy = makeExec({
      account_executions_id: 1,
      side: 'Buy',
      qty: 3,
      price: 4.0,
      commission: 0,
      expiry: '20260620',
      strike: 130,
    })
    const sell = makeExec({
      account_executions_id: 2,
      side: 'Sell',
      qty: 1,
      price: 6.0,
      commission: 0,
      expiry: '20260620',
      strike: 130,
      time: 1700001000,
    })
    const pairs = computeOptPairsFromExecutions([buy, sell])
    expect(pairs).toHaveLength(1)
    expect(pairs[0].qty).toBe(1)
    // net_pnl = (-1*4*100) + (1*6*100) = -400 + 600 = 200
    expect(pairs[0].net_pnl).toBeCloseTo(200, 0)
  })

  it('does not pair same-side executions', () => {
    const buy1 = makeExec({ account_executions_id: 1, side: 'Buy', qty: 1, price: 3.0 })
    const buy2 = makeExec({ account_executions_id: 2, side: 'Buy', qty: 1, price: 4.0 })
    const pairs = computeOptPairsFromExecutions([buy1, buy2])
    expect(pairs).toHaveLength(0)
  })
})
