import { describe, expect, it } from 'vitest'
import type { Execution } from '@/types/positions'
import { buildLedgerMetricExplainPayload } from './ledgerSummaryExplainPayload'

function stk(partial: Partial<Execution> & Pick<Execution, 'symbol' | 'account_id'>): Execution {
  return {
    account_executions_id: 1,
    contract_key: `${partial.symbol}|STK|||`,
    sec_type: 'STK',
    side: 'Buy',
    qty: 1,
    price: 1,
    time: 1_700_000_000,
    ...partial,
  }
}

describe('stocks_total_unrealized explain copy', () => {
  it('names position × (price − avgCost), not the snapshot unrealized_pnl field', () => {
    const payload = buildLedgerMetricExplainPayload({
      kind: 'stocks_total_unrealized',
      id: 'stk-total-u',
      ledgerTabLabel: 'Shares',
      summaryPeriodModeLabel: 'Month',
      ledgerSummaryPeriod: 'month',
      closedOptionGroups: [],
      stockFilteredExecutions: [stk({ symbol: 'AAA', account_id: 'DU0000001' })],
      closedOptGroupsPnlSum: 0,
      stkUnrealizedByAccountContract: new Map([['DU0000001|AAA|STK|||', 100]]),
    })
    const text = payload.formulaLines.join('\n')
    expect(text).toMatch(/position × \(price − avgCost\)/)
    expect(text).not.toMatch(/unrealized_pnl from GET \/status/)
  })
})
