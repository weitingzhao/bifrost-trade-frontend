import { describe, it, expect } from 'vitest'
import {
  optionRightToFull,
  normalizeStrike,
  executionDateStr,
  getTimeRangeDates,
  listDateStrings,
  listMonthKeysInRange,
  computeOptPairsFromExecutions,
  computeBackendOptPairsFromExecutions,
  computeOptionDayPnLForPerformanceDate,
  matchPairLegCashFlows,
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

describe('matchPairLegCashFlows', () => {
  it('splits open premium and close cost for short-then-cover', () => {
    const { cashC, cashP, net } = matchPairLegCashFlows({
      quantity: 5,
      c_side: 'SELL',
      p_side: 'BUY',
      c_price: 27.24,
      p_price: 2.88,
      commission: 7.2173,
    })
    // Open (sell) before close cost ≈ +13616; close ≈ −1443; net ≈ 12173
    expect(cashC).toBeCloseTo(13616.39135, 2)
    expect(cashP).toBeCloseTo(-1443.60865, 2)
    expect(net).toBeCloseTo(12172.7827, 2)
    expect(cashC + cashP).toBeCloseTo(net, 6)
  })
})

describe('computeOptionDayPnLForPerformanceDate OCC symbols', () => {
  it('does not net matched close cash into day U when symbol is OCC-spaced', () => {
    // Prior short + same-day cover (realized) alongside a new short (unrealized).
    // Regression: pairKey used full OCC symbol while contractKey used ticker root,
    // so matched qty never joined and U became Σ all day cash (~$109 style bug).
    const priorSell = makeExec({
      account_executions_id: 10,
      symbol: 'SPCX  261016C00165000',
      side: 'Sell',
      qty: 2,
      quantity: 2,
      price: 11.75,
      commission: 0,
      expiry: '20261016',
      strike: 165,
      trade_date: '2026-08-11',
      time: 1_700_000_000,
    })
    const dayCover = makeExec({
      account_executions_id: 11,
      symbol: 'SPCX  261016C00165000',
      side: 'Buy',
      qty: 2,
      quantity: 2,
      price: 4.35,
      commission: 0,
      expiry: '20261016',
      strike: 165,
      trade_date: '2026-08-20',
      time: 1_700_100_000,
    })
    const dayOpen = makeExec({
      account_executions_id: 12,
      symbol: 'HIMS  261218C00040000',
      side: 'Sell',
      qty: 4,
      quantity: 4,
      price: 3.8,
      commission: 2.833672,
      expiry: '20261218',
      strike: 40,
      trade_date: '2026-08-20',
      time: 1_700_100_100,
    })
    const slice = [priorSell, dayCover, dayOpen]
    const pairs = computeBackendOptPairsFromExecutions(slice)
    const day = computeOptionDayPnLForPerformanceDate('2026-08-20', slice, pairs)
    // HIMS unmatched only: 4*3.8*100 - 2.833672
    expect(day.unrealized).toBeCloseTo(1517.166328, 2)
    expect(Math.abs(day.realized)).toBeGreaterThan(100)
  })
})
