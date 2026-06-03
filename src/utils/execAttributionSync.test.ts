import { describe, it, expect } from 'vitest'
import type { Execution } from '@/types/positions'
import {
  findMatchingFinalForTws,
  findMatchingTwsForFinal,
  twsNeedsStrategySyncFromFinal,
  finalNeedsStrategySyncFromTws,
  shouldShowOptionExecSync,
} from './execAttributionSync'

function ex(partial: Partial<Execution> & Pick<Execution, 'account_executions_id'>): Execution {
  return {
    account_id: 'U1',
    sec_type: 'OPT',
    contract_key: 'RKLB|OPT|20260821|115|C',
    ...partial,
  } as Execution
}

describe('execAttributionSync', () => {
  it('matches by exec_id first', () => {
    const final = ex({ account_executions_id: 1, exec_id: 'E99', time: 100 })
    const tws = ex({ account_executions_id: 2, exec_id: 'E99', time: 200 })
    expect(findMatchingTwsForFinal(final, [tws])).toBe(tws)
    expect(findMatchingFinalForTws(tws, [final])).toBe(final)
  })

  it('shows sync on TWS when final has attribution and differs', () => {
    const final = ex({
      account_executions_id: 1,
      strategy_instance_id: 66,
      strategy_opportunity_id: 10,
    })
    const tws = ex({ account_executions_id: 2, strategy_instance_id: null })
    const keys = new Set(['U1|OPT|20260821|115|C'])
    expect(twsNeedsStrategySyncFromFinal(tws, final)).toBe(true)
    expect(
      shouldShowOptionExecSync({ book: 'tws', exec: tws, crossBookMatch: final, canonicalOptContractKeys: keys }),
    ).toBe(true)
  })

  it('shows sync on final when TWS has attribution and differs', () => {
    const tws = ex({
      account_executions_id: 2,
      strategy_instance_id: 66,
    })
    const final = ex({ account_executions_id: 1, strategy_instance_id: null })
    const keys = new Set(['U1|OPT|20260821|115|C'])
    expect(finalNeedsStrategySyncFromTws(final, tws)).toBe(true)
    expect(
      shouldShowOptionExecSync({ book: 'final', exec: final, crossBookMatch: tws, canonicalOptContractKeys: keys }),
    ).toBe(true)
  })

  it('hides sync when canonical contract key missing', () => {
    const final = ex({ account_executions_id: 1, strategy_instance_id: 66 })
    const tws = ex({ account_executions_id: 2 })
    expect(
      shouldShowOptionExecSync({
        book: 'tws',
        exec: tws,
        crossBookMatch: final,
        canonicalOptContractKeys: new Set(),
      }),
    ).toBe(false)
  })
})
