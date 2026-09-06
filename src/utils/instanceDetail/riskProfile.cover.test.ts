import { describe, it, expect } from 'vitest'
import { computeInstanceRiskProfile } from './riskProfile'
import type { Execution } from '@/types/positions'
import type { IbAccountSnapshot } from '@/types/monitor'
import type { StrategyStructure } from '@/types/strategy'

const sellCall = (account_id: string, quantity: number): Execution =>
  ({
    sec_type: 'OPT',
    contract_key: `${account_id}|NVDA|20261120|250|C`,
    symbol: 'NVDA',
    side: 'SELL',
    quantity,
    price: 10,
    account_id,
  }) as unknown as Execution

const account = (account_id: string, position: number): IbAccountSnapshot =>
  ({ account_id, positions: [{ symbol: 'NVDA', secType: 'STK', position, avgCost: 120 }] }) as unknown as IbAccountSnapshot

const optionOnlyTemplate = { legs: [{ role: 'short_call' }] } as unknown as StrategyStructure

describe('computeInstanceRiskProfile — cover without a template underlying leg', () => {
  it('sets same-account shares against the short calls', () => {
    const rp = computeInstanceRiskProfile([sellCall('U1', 5)], optionOnlyTemplate, [account('U1', 500)])
    expect(rp!.naked_short_call_contracts).toBe(0)
    expect(rp!.risk_type).not.toBe('unlimited')
    expect(rp!.calc_context?.covered_shares).toBe(500)
  })
  it('shares in another account do not cover', () => {
    const rp = computeInstanceRiskProfile([sellCall('U2', 5)], optionOnlyTemplate, [account('U1', 500)])
    expect(rp!.naked_short_call_contracts).toBe(5)
    expect(rp!.risk_type).toBe('unlimited')
  })
  it('a template with an underlying leg still takes the full position', () => {
    const withUnderlying = { legs: [{ role: 'underlying' }, { role: 'short_call' }] } as unknown as StrategyStructure
    const rp = computeInstanceRiskProfile([sellCall('U1', 1)], withUnderlying, [account('U1', 500)])
    expect(rp!.calc_context?.covered_shares).toBe(500)
  })
})
