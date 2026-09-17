import { describe, it, expect } from 'vitest'
import { buildOptionsSummaryByMonth, lastFillTradeDate } from './ledgerSummaryGroups'
import type { OptExecutionGroup } from '@/utils/ledger/optExecutionGroups'

describe('buildOptionsSummaryByMonth', () => {
  it('buckets by last fill trade_date, not max(time) UTC', () => {
    // Axis change (handoff B5): a May UTC clock on a February trade_date used to land in May.
    const group: OptExecutionGroup = {
      contract_key: 'AAA|OPT|C|10|20240621',
      symbol: 'AAA',
      strike: 10,
      expiry: '20240621',
      option_right: 'C',
      account_id: 'U0000001',
      net_qty: 0,
      buy_volume: 1,
      sell_volume: 1,
      buy_avg_price: 1,
      sell_avg_price: 1,
      buy_cost: 100,
      sell_premium: 100,
      realized_pnl: 0,
      status: 'realized',
      trades: [
        {
          account_executions_id: 1,
          trade_date: '2024-02-15',
          time: Math.floor(Date.UTC(2024, 4, 10, 12, 0, 0) / 1000),
          quantity: 1,
          price: 1,
          side: 'Sell',
        } as OptExecutionGroup['trades'][number],
      ],
    }
    const rows = buildOptionsSummaryByMonth([group])
    expect(lastFillTradeDate(group)).toBe('2024-02-15')
    expect(rows).toHaveLength(1)
    expect(rows[0]![0]).toBe('2024-02')
    expect(rows[0]![1].count).toBe(1)
  })

  it('omits a group whose fills have no trade_date', () => {
    const group: OptExecutionGroup = {
      contract_key: 'AAA|OPT|P|10|20240621',
      symbol: 'AAA',
      strike: 10,
      expiry: '20240621',
      option_right: 'P',
      account_id: 'U0000001',
      net_qty: 0,
      buy_volume: 1,
      sell_volume: 1,
      buy_avg_price: 1,
      sell_avg_price: 1,
      buy_cost: 1,
      sell_premium: 1,
      realized_pnl: 0,
      status: 'realized',
      trades: [
        {
          account_executions_id: 2,
          trade_date: null,
          time: 1_700_000_000,
          quantity: 1,
          price: 0,
          side: 'Buy',
        } as OptExecutionGroup['trades'][number],
      ],
    }
    expect(buildOptionsSummaryByMonth([group])).toEqual([])
  })
})
