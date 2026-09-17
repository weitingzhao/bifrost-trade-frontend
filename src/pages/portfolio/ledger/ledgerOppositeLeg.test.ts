import { describe, expect, it } from 'vitest'
import type { Execution } from '@/types/positions'
import { oppositeLegSyncPayload } from './ledgerOppositeLeg'

function fill(partial: Partial<Execution> & Pick<Execution, 'account_executions_id' | 'side'>): Execution {
  return {
    account_id: 'A1',
    contract_key: 'ZZZ  240119C00050000',
    symbol: 'ZZZ',
    sec_type: 'OPT',
    qty: 1,
    quantity: 1,
    price: 2,
    time: 1_700_000_000,
    strategy_opportunity_id: null,
    strategy_instance_id: null,
    ...partial,
  } as Execution
}

const buyLinked = fill({
  account_executions_id: 11,
  side: 'Buy',
  quantity: 2,
  strategy_opportunity_id: 8,
  strategy_instance_id: 21,
})

describe('oppositeLegSyncPayload', () => {
  it('copies instance from the opposite-side same-qty fill', () => {
    const sell = fill({ account_executions_id: 12, side: 'Sell', quantity: 2 })
    expect(oppositeLegSyncPayload([buyLinked, sell], sell)).toEqual({
      opportunity_id: 8,
      instance_id: 21,
    })
  })

  it('does not match a different quantity (the old OptGroupRow rule)', () => {
    const sell = fill({ account_executions_id: 12, side: 'Sell', quantity: 1 })
    expect(oppositeLegSyncPayload([buyLinked, sell], sell)).toBeNull()
  })

  it('does not overwrite a fill that already has an instance', () => {
    const sellLinked = fill({
      account_executions_id: 12,
      side: 'Sell',
      quantity: 2,
      strategy_opportunity_id: 9,
      strategy_instance_id: 22,
    })
    expect(oppositeLegSyncPayload([buyLinked, sellLinked], sellLinked)).toBeNull()
  })
})
