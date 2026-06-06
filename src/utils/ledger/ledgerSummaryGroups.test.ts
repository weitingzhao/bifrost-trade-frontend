import { describe, it, expect } from 'vitest'
import {
  legacyUtcMonthKeyFromTimeSec,
  buildOptionsSummaryByMonth,
} from './ledgerSummaryGroups'
import type { OptExecutionGroup } from '@/utils/ledger/optExecutionGroups'

describe('legacyUtcMonthKeyFromTimeSec', () => {
  it('uses UTC month from execution time', () => {
    // 2024-05-01 00:30 UTC → 2024-05
    const ts = Math.floor(Date.UTC(2024, 4, 1, 0, 30, 0) / 1000)
    expect(legacyUtcMonthKeyFromTimeSec(ts)).toBe('2024-05')
  })
})

describe('buildOptionsSummaryByMonth (Legacy parity)', () => {
  it('buckets by max trade time UTC month, not trade_date', () => {
    const group: OptExecutionGroup = {
      contract_key: 'NVDA|OPT|C|250|20250620',
      symbol: 'NVDA',
      strike: 250,
      expiry: '20250620',
      option_right: 'C',
      account_id: 'U123',
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
    expect(rows).toHaveLength(1)
    expect(rows[0]![0]).toBe('2024-05')
    expect(rows[0]![1].count).toBe(1)
  })
})
