import { describe, expect, it } from 'vitest'
import type { Execution } from '@/types/positions'
import { buildOptExecutionGroups } from '@/utils/ledger/optExecutionGroups'
import {
  executionStrategyOpportunityKey,
  expandExecutionRowsForStrategyOptView,
  groupExecutionsByStrategyInstanceId,
  sliceExecutionForInstanceOptView,
} from '@/utils/ledger/ledgerOptHelpers'

function optFill(
  partial: Partial<Execution> & Pick<Execution, 'side' | 'contract_key' | 'strike'>,
): Execution {
  const qty = partial.qty ?? partial.quantity ?? 1
  return {
    ...partial,
    account_executions_id: partial.account_executions_id ?? 1,
    account_id: partial.account_id ?? 'U123',
    symbol: partial.symbol ?? 'RKLB',
    sec_type: partial.sec_type ?? 'OPT',
    price: partial.price ?? 1,
    time: partial.time ?? 1,
    qty,
    quantity: partial.quantity ?? qty,
  }
}

describe('strategy opt view allocation parity', () => {
  it('slice uses signed allocated_quantity (not parent-qty ratio)', () => {
    const ex = optFill({
      account_executions_id: 10,
      contract_key: 'RKLB|OPT|20260320|76|C',
      strike: 76,
      side: 'Sell',
      quantity: -4,
      instance_allocations: [{ strategy_instance_id: 5, allocated_quantity: -4 }],
    })
    const row = sliceExecutionForInstanceOptView(ex, 5)
    expect(row?.quantity).toBe(-4)
  })

  it('expand resolves strategy_opportunity_id from allocation row', () => {
    const ex = optFill({
      contract_key: 'RKLB|OPT|20260320|76|C',
      strike: 76,
      side: 'Buy',
      quantity: 4,
      strategy_opportunity_id: null,
      instance_allocations: [
        { strategy_instance_id: 5, allocated_quantity: 4, strategy_opportunity_id: 42 },
      ],
    })
    const [row] = expandExecutionRowsForStrategyOptView(ex)
    expect(row.strategy_opportunity_id).toBe(42)
    expect(executionStrategyOpportunityKey(row)).toBe(42)
  })

  it('bear call spread instance #5: both legs closed after strategy expand', () => {
    const fills: Execution[] = [
      optFill({
        account_executions_id: 1,
        contract_key: 'RKLB|OPT|20260320|80|C',
        strike: 80,
        side: 'Buy',
        quantity: 4,
        price: 2,
        instance_allocations: [{ strategy_instance_id: 5, allocated_quantity: 4 }],
      }),
      optFill({
        account_executions_id: 2,
        contract_key: 'RKLB|OPT|20260320|80|C',
        strike: 80,
        side: 'Sell',
        quantity: -4,
        price: 1.5,
        instance_allocations: [{ strategy_instance_id: 5, allocated_quantity: -4 }],
      }),
      optFill({
        account_executions_id: 3,
        contract_key: 'RKLB|OPT|20260320|76|C',
        strike: 76,
        side: 'Sell',
        quantity: -4,
        price: 3,
        instance_allocations: [{ strategy_instance_id: 5, allocated_quantity: -4 }],
      }),
      optFill({
        account_executions_id: 4,
        contract_key: 'RKLB|OPT|20260320|76|C',
        strike: 76,
        side: 'Buy',
        quantity: 4,
        price: 2.5,
        instance_allocations: [{ strategy_instance_id: 5, allocated_quantity: 4 }],
      }),
    ]

    const expanded = fills.flatMap(e => expandExecutionRowsForStrategyOptView(e))
    const byInst = groupExecutionsByStrategyInstanceId(expanded)
    const instTrades = byInst.get(5) ?? []
    const groups = buildOptExecutionGroups(instTrades)

    expect(groups).toHaveLength(2)
    expect(groups.every(g => g.status === 'realized')).toBe(true)
    expect(groups.reduce((s, g) => s + g.buy_volume, 0)).toBe(8)
    expect(groups.reduce((s, g) => s + g.sell_volume, 0)).toBe(8)
  })
})
