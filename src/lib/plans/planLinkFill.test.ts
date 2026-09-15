import { describe, expect, it } from 'vitest'
import type { StrategyInstance } from '@/types/strategy'
import { instancesTradingSymbol } from './planLinkFill'

function instance(over: Partial<StrategyInstance> & Pick<StrategyInstance, 'strategy_instance_id' | 'strategy_opportunity_id' | 'label'>): StrategyInstance {
  return {
    account_id: 'U1',
    notes: null,
    opened_at: '2026-09-15T12:00:00Z',
    opened_at_epoch: 1,
    created_at: '2026-09-15T12:00:00Z',
    created_at_epoch: 1,
    updated_at: null,
    strategy_opportunity_name: over.label,
    strategy_structure_id: null,
    strategy_structure_name: null,
    executions_count: 0,
    ...over,
  }
}

describe('instancesTradingSymbol', () => {
  it('keeps an instance whose opportunity lists the plan symbol', () => {
    const kept = instance({
      strategy_instance_id: 1,
      strategy_opportunity_id: 10,
      label: 'MU cash-secured put',
    })
    const dropped = instance({
      strategy_instance_id: 2,
      strategy_opportunity_id: 20,
      label: 'Premium MU lookalike book',
    })
    const result = instancesTradingSymbol(
      [kept, dropped],
      [
        { strategy_opportunity_id: 10, symbols: ['MU'] },
        { strategy_opportunity_id: 20, symbols: ['NVDA'] },
      ],
      'MU',
    )
    expect(result.map((r) => r.strategy_instance_id)).toEqual([1])
  })

  it('drops a name that contains MU when the opportunity does not list MU', () => {
    const decoy = instance({
      strategy_instance_id: 3,
      strategy_opportunity_id: 30,
      label: 'AMU basket',
    })
    expect(
      instancesTradingSymbol(
        [decoy],
        [{ strategy_opportunity_id: 30, symbols: ['NVDA', 'AAPL'] }],
        'MU',
      ),
    ).toEqual([])
  })
})
