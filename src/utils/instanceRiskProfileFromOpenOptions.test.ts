import { describe, it, expect } from 'vitest'
import { computeInstanceRiskProfileFromOpenOptions } from './instanceRiskProfileFromOpenOptions'
import type { LivePositionRow, OpenOptionPosition } from '@/types/positions'
import type { StrategyStructure } from '@/types/strategy'

const shortCall = (account_id: string, qty: number): OpenOptionPosition =>
  ({
    kind: 'live',
    contract_key: `${account_id}|NVDA|20261120|250|C`,
    symbol: 'NVDA',
    strike: 250,
    expiry: '20261120',
    right: 'C',
    qty,
    avg_cost: 10,
    mark_price: null,
    unrealized_pnl: 0,
    pool_label: 'On',
    account_id,
  }) as OpenOptionPosition

const shares = (account_id: string, position: number): LivePositionRow =>
  ({ symbol: 'NVDA', position, avgCost: 120, price: 180, secType: 'STK', account_id }) as LivePositionRow

// A covered-call template that, like most, names only the option leg.
const optionOnlyTemplate = { legs: [{ role: 'short_call', direction: 'short', quantity: 1 }] } as unknown as StrategyStructure

describe('computeInstanceRiskProfileFromOpenOptions — cover without a template leg', () => {
  it('sets held shares in the same account against the short calls', () => {
    const rp = computeInstanceRiskProfileFromOpenOptions([shortCall('U1', -5)], optionOnlyTemplate, [shares('U1', 500)])
    expect(rp).not.toBeNull()
    expect(rp!.naked_short_call_contracts).toBe(0)
    expect(rp!.risk_type).not.toBe('unlimited')
    expect(rp!.calc_context?.covered_shares).toBe(500)
  })

  it('does not let shares in another account cover the calls', () => {
    const rp = computeInstanceRiskProfileFromOpenOptions([shortCall('U2', -5)], optionOnlyTemplate, [shares('U1', 500)])
    expect(rp!.naked_short_call_contracts).toBe(5)
    expect(rp!.risk_type).toBe('unlimited')
  })

  it('covers only as many contracts as whole shares allow', () => {
    const rp = computeInstanceRiskProfileFromOpenOptions([shortCall('U1', -5)], optionOnlyTemplate, [shares('U1', 250.7)])
    expect(rp!.calc_context?.covered_shares).toBe(250)
    expect(rp!.naked_short_call_contracts).toBe(3)
  })
})
