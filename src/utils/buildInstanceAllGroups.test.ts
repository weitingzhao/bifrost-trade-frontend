import { describe, it, expect } from 'vitest'
import { buildInstanceAllGroups } from './buildInstanceAllGroups'
import type { Execution, InstancePositionGroup, OpenOptionPosition } from '@/types/positions'
import type { StrategyOpportunity, StrategyStructure } from '@/types/strategy'

function liveOpt(overrides: Partial<OpenOptionPosition>): OpenOptionPosition {
  return {
    kind: 'live',
    contract_key: 'NVDA|OPT|20250620|120|C',
    symbol: 'NVDA',
    right: 'C',
    strike: 120,
    expiry: '20250620',
    qty: 1,
    avg_cost: 5,
    mark_price: null,
    unrealized_pnl: 100,
    pool_label: 'On',
    account_id: 'U001',
    attribution_type: 'single',
    ...overrides,
  }
}

describe('buildInstanceAllGroups', () => {
  const baseGroup: InstancePositionGroup = {
    strategy_instance_id: 10,
    strategy_instance_label: 'Inst #10',
    strategy_opportunity_name: 'Opp A',
    strategy_opportunity_id: 1,
    strategy_instance_opened_at_epoch: 1700000000,
    positions: [liveOpt({})],
    total_unrealized_pnl: 100,
  }

  it('enriches structure_type and scope from opportunity/structure', () => {
    const groups = buildInstanceAllGroups({
      instanceGroups: [baseGroup],
      attributions: [],
      executionsFinal: [],
      executionsTws: [],
      opportunities: [
        {
          strategy_opportunity_id: 1,
          name: 'Opp A',
          strategy_structure_id: 5,
          scope_type: 'single_stk',
          symbols: ['NVDA'],
        } as StrategyOpportunity,
      ],
      structures: [
        {
          strategy_structure_id: 5,
          structure_type: 'long_call',
          name: 'Long Call',
        } as StrategyStructure,
      ],
      liveStocks: [],
    })
    expect(groups).toHaveLength(1)
    expect(groups[0].structure_type).toBe('long_call')
    expect(groups[0].scope_type).toBe('single_stk')
    expect(groups[0].strategy_opportunity_id).toBe(1)
  })

  it('uses exec premium PnL when executions match instance', () => {
    const execs: Execution[] = [
      {
        account_executions_id: 1,
        account_id: 'U001',
        contract_key: 'NVDA|OPT|20250620|120|C',
        symbol: 'NVDA',
        sec_type: 'OPT',
        right: 'C',
        strike: 120,
        expiry: '20250620',
        side: 'Buy',
        qty: 1,
        price: 4,
        time: 1700000000,
        strategy_instance_id: 10,
        strategy_opportunity_id: 1,
      },
    ]
    const groups = buildInstanceAllGroups({
      instanceGroups: [baseGroup],
      attributions: [],
      executionsFinal: execs,
      executionsTws: [],
      opportunities: [],
      structures: [],
      liveStocks: [],
    })
    expect(groups[0].options_unrealized_pnl).toBe(-400)
  })
})
