import { describe, it, expect } from 'vitest'
import type { Execution } from '@/types/positions'
import { buildLiveOptExecutionMap, optExecutionMatchKey } from './positionsExecutions'

function optExec(
  partial: Partial<Execution> & Pick<Execution, 'account_executions_id' | 'contract_key'>,
): Execution {
  return {
    account_id: 'U17123565',
    sec_type: 'OPT',
    symbol: 'MRVL',
    ...partial,
  } as Execution
}

describe('optExecutionMatchKey', () => {
  it('includes symbol so different underlyings with same strike do not collide', () => {
    const mrvlKey = optExecutionMatchKey('U17123565', 'MRVL|OPT|20260918|180|P')
    const ddogKey = optExecutionMatchKey('U17123565', 'DDOG|OPT|20260918|180|P')
    expect(mrvlKey).toBe('U17123565|MRVL|OPT|20260918|180|P')
    expect(ddogKey).toBe('U17123565|DDOG|OPT|20260918|180|P')
    expect(mrvlKey).not.toBe(ddogKey)
  })

  it('normalizes OCC local symbol segment to short root', () => {
    const shortKey = optExecutionMatchKey('U1', 'MRVL|OPT|20260918|180|P')
    const occKey = optExecutionMatchKey('U1', 'MRVL  260918P00180000|OPT|20260918|180|P')
    expect(shortKey).toBe(occKey)
  })
})

describe('buildLiveOptExecutionMap', () => {
  it('keeps executions separate per underlying', () => {
    const execs = [
      optExec({ account_executions_id: 5048, contract_key: 'MRVL|OPT|20260918|180|P', symbol: 'MRVL' }),
      optExec({ account_executions_id: 5056, contract_key: 'DDOG|OPT|20260918|180|P', symbol: 'DDOG' }),
    ]
    const map = buildLiveOptExecutionMap(execs)
    const mrvl = map.get(optExecutionMatchKey('U17123565', 'MRVL|OPT|20260918|180|P'))
    const ddog = map.get(optExecutionMatchKey('U17123565', 'DDOG|OPT|20260918|180|P'))
    expect(mrvl?.map((e) => e.account_executions_id)).toEqual([5048])
    expect(ddog?.map((e) => e.account_executions_id)).toEqual([5056])
  })
})
