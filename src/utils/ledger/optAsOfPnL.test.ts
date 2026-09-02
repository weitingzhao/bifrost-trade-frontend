import { describe, expect, it } from 'vitest'
import type { Execution } from '@/types/positions'
import {
  aggregateOpenOptLegsByContract,
  attributeOpenUnrealizedByOpenMonth,
  chicagoTodayDateStr,
  computeOptOpenUnrealizedAsOf,
  listOpenOptCashLegsAsOf,
} from '@/utils/ledger/optAsOfPnL'
import { ledgerOptionExecutionCashFlowSigned } from '@/utils/ledger/performanceUtils'

function makeOpt(overrides: Partial<Execution> & { account_executions_id: number }): Execution {
  return {
    account_id: 'U1',
    contract_key: 'RKLB|OPT|20261218|20|P',
    symbol: 'RKLB',
    sec_type: 'OPT',
    side: 'Sell',
    qty: 1,
    price: 5,
    time: 1_700_000_000,
    trade_date: '2026-04-01',
    option_right: 'P',
    expiry: '20261218',
    strike: 20,
    commission: 0,
    ...overrides,
  }
}

describe('computeOptOpenUnrealizedAsOf', () => {
  it('open short: Open U equals sell premium cash; after close Open U is 0', () => {
    const open = makeOpt({
      account_executions_id: 1,
      trade_date: '2026-04-01',
      side: 'Sell',
      price: 5,
    })
    const asOfOpen = computeOptOpenUnrealizedAsOf([open], '2026-05-01')
    expect(asOfOpen.openUnrealized).toBeCloseTo(ledgerOptionExecutionCashFlowSigned(open), 6)

    const close = makeOpt({
      account_executions_id: 2,
      trade_date: '2026-05-14',
      side: 'Buy',
      price: 8,
      time: 1_700_100_000,
    })
    const asOfClosed = computeOptOpenUnrealizedAsOf([open, close], '2026-05-14')
    expect(Math.abs(asOfClosed.openUnrealized)).toBeLessThan(0.005)
  })

  it('ignores executions after as-of date', () => {
    const open = makeOpt({
      account_executions_id: 1,
      trade_date: '2026-06-01',
      side: 'Sell',
      price: 5,
    })
    const before = computeOptOpenUnrealizedAsOf([open], '2026-05-01')
    expect(before.openUnrealized).toBe(0)
  })
})

describe('chicagoTodayDateStr', () => {
  it('returns YYYY-MM-DD', () => {
    expect(chicagoTodayDateStr(Date.UTC(2026, 8, 2, 18, 0, 0))).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('listOpenOptCashLegsAsOf expiry', () => {
  it('excludes unmatched legs whose option already expired as of cut date', () => {
    const open = makeOpt({
      account_executions_id: 1,
      trade_date: '2026-02-18',
      side: 'Buy',
      price: 0.01,
      qty: 2,
      expiry: '20260220',
      contract_key: 'NVDA|OPT|20260220|210|C',
      symbol: 'NVDA 260220C00210000',
      option_right: 'C',
      strike: 210,
    })
    const afterExpiry = listOpenOptCashLegsAsOf([open], '2026-09-02')
    expect(afterExpiry).toHaveLength(0)

    const beforeExpiry = listOpenOptCashLegsAsOf([open], '2026-02-19')
    expect(beforeExpiry).toHaveLength(1)
    expect(beforeExpiry[0]!.unmatchedQty).toBeCloseTo(2, 6)
  })

  it('excludes on the expiry calendar day (settled as-of EOD inventory)', () => {
    const open = makeOpt({
      account_executions_id: 1,
      trade_date: '2026-02-18',
      side: 'Buy',
      price: 0.01,
      qty: 2,
      expiry: '20260220',
      contract_key: 'NVDA|OPT|20260220|210|C',
      option_right: 'C',
      strike: 210,
    })
    expect(listOpenOptCashLegsAsOf([open], '2026-02-20')).toHaveLength(0)
  })
})

describe('attributeOpenUnrealizedByOpenMonth', () => {
  it('attributes still-open cash to the open month', () => {
    const openApr = makeOpt({
      account_executions_id: 1,
      trade_date: '2026-04-10',
      side: 'Sell',
      price: 5,
    })
    const openMay = makeOpt({
      account_executions_id: 2,
      trade_date: '2026-05-10',
      side: 'Sell',
      price: 3,
      contract_key: 'RKLB|OPT|20261218|22|P',
      expiry: '20261218',
      strike: 22,
    })
    const byMonth = attributeOpenUnrealizedByOpenMonth([openApr, openMay], '2026-09-02')
    expect(byMonth['2026-04']).toBeCloseTo(ledgerOptionExecutionCashFlowSigned(openApr), 6)
    expect(byMonth['2026-05']).toBeCloseTo(ledgerOptionExecutionCashFlowSigned(openMay), 6)
  })
})

describe('aggregateOpenOptLegsByContract', () => {
  it('groups still-open fills by contract', () => {
    const a = makeOpt({
      account_executions_id: 1,
      trade_date: '2026-08-01',
      side: 'Sell',
      price: 5,
      qty: 1,
    })
    const b = makeOpt({
      account_executions_id: 2,
      trade_date: '2026-08-15',
      side: 'Sell',
      price: 4,
      qty: 2,
    })
    const legs = listOpenOptCashLegsAsOf([a, b], '2026-09-02')
    const rows = aggregateOpenOptLegsByContract(legs)
    expect(rows).toHaveLength(1)
    expect(rows[0]!.unmatchedQty).toBeCloseTo(3, 6)
    expect(rows[0]!.fillCount).toBe(2)
    expect(rows[0]!.openDateStr).toBe('2026-08-01')
  })
})
