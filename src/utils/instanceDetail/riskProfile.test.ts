import { describe, it, expect } from 'vitest'
import { computeInstanceRiskProfile } from './riskProfile'
import type { Execution } from '@/types/positions'
import type { StrategyStructure } from '@/types/strategy'
import type { IbAccountSnapshot } from '@/types/monitor'

function baseStructure(legs: StrategyStructure['legs']): StrategyStructure {
  return {
    strategy_structure_id: 1,
    name: 'Test',
    structure_type: 'test',
    structure_subtype: null,
    structure_subtype_label: null,
    strategy_template_id: null,
    template_code: null,
    template_display_name: null,
    dim_direction: null,
    dim_structure: null,
    dim_coverage: null,
    dim_risk: null,
    dim_volatility: null,
    dim_time: null,
    version: 1,
    is_active: true,
    created_at: null,
    updated_at: null,
    notes: null,
    constraints: [],
    legs,
  }
}

const structureWithUnderlying = baseStructure([
  {
    role: 'underlying',
    direction: 'long',
    quantity: 1,
    option_right: null,
    strike: null,
    expiration: null,
  },
  {
    role: 'short_call',
    direction: 'short',
    quantity: 1,
    option_right: 'C',
    strike: null,
    expiration: null,
  },
])

const nakedShortCallStructure = baseStructure([
  {
    role: 'short_call',
    direction: 'short',
    quantity: 1,
    option_right: 'C',
    strike: null,
    expiration: null,
  },
])

const accountsWithNvda: IbAccountSnapshot[] = [
  {
    account_id: 'U123',
    positions: [
      {
        secType: 'STK',
        symbol: 'NVDA',
        position: 100,
        avgCost: 250,
      },
    ],
  },
]

describe('computeInstanceRiskProfile (Legacy StrategyInstanceDetailPage parity)', () => {
  it('uses no stock hedge when instance structure has no underlying leg', () => {
    const executions: Execution[] = [
      {
        account_executions_id: 1,
        contract_key: 'NVDA|OPT|20260717|250|C',
        symbol: 'NVDA',
        sec_type: 'OPT',
        account_id: 'U123',
        side: 'Sell',
        qty: 1,
        price: 23.68,
        time: null,
      },
    ]

    const profile = computeInstanceRiskProfile(executions, nakedShortCallStructure, accountsWithNvda)
    expect(profile).not.toBeNull()
    expect(profile!.risk_type).toBe('unlimited')
    expect(profile!.calc_context?.covered_shares).toBe(0)
    expect(profile!.max_loss).toBeNull()
  })

  it('uses full account stock (not min required) when structure has underlying leg', () => {
    const executions: Execution[] = [
      {
        account_executions_id: 1,
        contract_key: 'NVDA|OPT|20260717|250|C',
        symbol: 'NVDA',
        sec_type: 'OPT',
        account_id: 'U123',
        side: 'Sell',
        qty: 2,
        price: 11.84,
        time: null,
      },
    ]

    const profile = computeInstanceRiskProfile(executions, structureWithUnderlying, accountsWithNvda)
    expect(profile).not.toBeNull()
    expect(profile!.risk_type).toBe('unlimited')
    expect(profile!.naked_short_call_contracts).toBeGreaterThan(0)
    expect(profile!.calc_context?.covered_shares).toBe(100)
  })
})
