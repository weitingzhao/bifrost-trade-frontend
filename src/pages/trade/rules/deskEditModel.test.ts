import { describe, expect, it } from 'vitest'
import type { ChainData } from '@/hooks/useRulesChain'
import type { StrategyInstance } from '@/types/strategy'
import { gateInUseReason, withoutHeld } from './deskEditModel'

const DATA = {
  structures: [],
  opportunities: [
    { strategy_opportunity_id: 1, default_gate_safety_strategy_id: 9 },
    { strategy_opportunity_id: 2, default_gate_safety_strategy_id: null },
  ],
  allocations: [{ strategy_allocation_id: 5, gate_safety_strategy_id: 8, strategy_opportunity_ids: [1, 2] }],
  gates: [{ gate_safety_strategy_id: 8 }, { gate_safety_strategy_id: 9 }, { gate_safety_strategy_id: 10 }],
  instances: [{ id: 30, opportunityId: 1 }],
} as unknown as ChainData
const RAW = [{ strategy_instance_id: 30 }] as unknown as StrategyInstance[]
const none = () => false

describe('the Desk with held deletes (Rev .140)', () => {
  it('a held opportunity leaves the chain and its allocations', () => {
    const v = withoutHeld(DATA, RAW, { opportunity: (id) => id === 2, allocation: none, gate: none, instance: none })
    expect(v.data.opportunities.map((o) => o.strategy_opportunity_id)).toEqual([1])
    expect(v.data.allocations[0].strategy_opportunity_ids).toEqual([1])
  })

  it('a held trade leaves both the readings and the raw records', () => {
    const v = withoutHeld(DATA, RAW, { opportunity: none, allocation: none, gate: none, instance: (id) => id === 30 })
    expect(v.data.instances).toEqual([])
    expect(v.rawInstances).toEqual([])
  })
})

describe('why a gate set stays', () => {
  it('names what points at it', () => {
    expect(gateInUseReason(DATA, 9, null)).toBe('1 opportunity uses it — point them at another gate set first.')
    expect(gateInUseReason(DATA, 8, null)).toBe('1 allocation uses it — point them at another gate set first.')
  })
  it("the daemon's own gate stays; an unused one may go", () => {
    expect(gateInUseReason(DATA, 10, 10)).toMatch(/daemon's settings/)
    expect(gateInUseReason(DATA, 10, null)).toBeNull()
  })
})
