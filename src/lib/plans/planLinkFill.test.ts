import { describe, expect, it } from 'vitest'
import type { Trade } from '@/types/strategy'
import { tradesTradingSymbol } from './planLinkFill'

function trade(over: Partial<Trade> & Pick<Trade, 'trade_id' | 'strategy_opportunity_id' | 'label'>): Trade {
  return {
    account_id: 'U1',
    opened_at: '2026-09-15T12:00:00Z',
    opened_at_epoch: 1,
    created_at: '2026-09-15T12:00:00Z',
    created_at_epoch: 1,
    updated_at: '2031-03-04T14:30:00Z',
    strategy_opportunity_name: over.label,
    strategy_structure_id: null,
    strategy_structure_name: null,
    executions_count: 0,
    ...over,
  }
}

describe('tradesTradingSymbol', () => {
  it('keeps an instance whose opportunity lists the plan symbol', () => {
    const kept = trade({
      trade_id: 1,
      strategy_opportunity_id: 10,
      label: 'MU cash-secured put',
    })
    const dropped = trade({
      trade_id: 2,
      strategy_opportunity_id: 20,
      label: 'Premium MU lookalike book',
    })
    const result = tradesTradingSymbol(
      [kept, dropped],
      [
        { strategy_opportunity_id: 10, symbols: ['MU'] },
        { strategy_opportunity_id: 20, symbols: ['NVDA'] },
      ],
      'MU',
    )
    expect(result.map((r) => r.trade_id)).toEqual([1])
  })

  it('drops a name that contains MU when the opportunity does not list MU', () => {
    const decoy = trade({
      trade_id: 3,
      strategy_opportunity_id: 30,
      label: 'AMU basket',
    })
    expect(
      tradesTradingSymbol(
        [decoy],
        [{ strategy_opportunity_id: 30, symbols: ['NVDA', 'AAPL'] }],
        'MU',
      ),
    ).toEqual([])
  })
})
