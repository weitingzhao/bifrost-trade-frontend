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

  it('enriches the template, structure name and scope from opportunity/structure', () => {
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
          template_code: 'long_call',
          template_display_name: 'Long Call',
          name: 'NVDA long call',
        } as StrategyStructure,
      ],
      liveStocks: [],
    })
    expect(groups).toHaveLength(1)
    expect(groups[0].template_code).toBe('long_call')
    expect(groups[0].template_label).toBe('Long Call')
    expect(groups[0].structure_name).toBe('NVDA long call')
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
        option_right: 'C',
        strike: 120,
        expiry: '20250620',
        side: 'Buy',
        quantity: 1,
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

  it('keys the filter on the template code even when the structures list misses the id (TD-41)', () => {
    // Attribution used to put the structure *name* under structure_type, so a missing
    // structures row mixed names into a filter of template codes.
    const groups = buildInstanceAllGroups({
      instanceGroups: [baseGroup],
      attributions: [
        {
          strategy_instance_id: 10,
          strategy_structure_id: 9,
          strategy_structure_name: 'Iron Condor weekly',
          template_code: 'iron_condor',
          structure_type: 'Iron Condor weekly',
          scope_type: null,
        } as never,
      ],
      executionsFinal: [],
      executionsTws: [],
      opportunities: [],
      structures: [],
      liveStocks: [],
    })
    expect(groups[0].template_code).toBe('iron_condor')
    expect(groups[0].structure_name).toBe('Iron Condor weekly')
  })
})
