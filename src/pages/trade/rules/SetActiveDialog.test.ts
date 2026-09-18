import { describe, expect, it } from 'vitest'
import { planActive } from './SetActiveDialog'
import type { ChainData } from '@/hooks/useRulesChain'
import type {
  GateSafetyItem,
  StrategyAllocation,
  StrategyOpportunity,
  StrategyStructure,
} from '@/types/strategy'

function data(p: Partial<ChainData> = {}): ChainData {
  return { structures: [], opportunities: [], allocations: [], gates: [], instances: [], ...p }
}

const CSP = { strategy_structure_id: 1, name: 'Cash Secured Put' } as StrategyStructure
const CC = { strategy_structure_id: 2, name: 'Covered Call' } as StrategyStructure
const GATE = { gate_safety_strategy_id: 7, name: 'Security Gate', version: 2 } as GateSafetyItem

function opp(id: number, structureId: number | null): StrategyOpportunity {
  return { strategy_opportunity_id: id, strategy_structure_id: structureId } as StrategyOpportunity
}

function alloc(p: Partial<StrategyAllocation> = {}): StrategyAllocation {
  return {
    strategy_allocation_id: 1,
    name: 'Income Q3',
    gate_safety_strategy_id: 7,
    strategy_opportunity_ids: [10],
    ...p,
  } as StrategyAllocation
}

describe('planActive', () => {
  it('takes the gate from the allocation — a gate hangs off the allocation, it is not chosen separately', () => {
    const p = planActive(data({ allocations: [alloc()], gates: [GATE], opportunities: [opp(10, 1)], structures: [CSP] }), 1, null)
    expect(p.gateId).toBe(7)
    expect(p.gateLabel).toBe('Security Gate · v2')
  })

  it('derives the structure when every opportunity under it names the same one', () => {
    const d = data({
      allocations: [alloc({ strategy_opportunity_ids: [10, 11] })],
      gates: [GATE],
      opportunities: [opp(10, 1), opp(11, 1)],
      structures: [CSP, CC],
    })
    expect(planActive(d, 1, null).structureId).toBe(1)
    expect(planActive(d, 1, null).structureLabel).toBe('Cash Secured Put')
  })

  it('leaves the structure alone when the allocation mixes shapes, rather than picking one', () => {
    // Telling the daemon a shape the rulebook does not say is worse than
    // leaving the field where it was.
    const d = data({
      allocations: [alloc({ strategy_opportunity_ids: [10, 11] })],
      gates: [GATE],
      opportunities: [opp(10, 1), opp(11, 2)],
      structures: [CSP, CC],
    })
    const p = planActive(d, 1, 99)
    expect(p.structureId).toBe(99)
    expect(p.structureLabel).toMatch(/different shapes/)
  })

  it('leaves the structure alone when no opportunity under it names one', () => {
    const d = data({ allocations: [alloc()], gates: [GATE], opportunities: [opp(10, null)] })
    const p = planActive(d, 1, 99)
    expect(p.structureId).toBe(99)
    expect(p.structureLabel).toMatch(/no opportunity under it names a structure/)
  })

  it('says a gateless allocation carries none rather than inventing one', () => {
    const d = data({ allocations: [alloc({ gate_safety_strategy_id: null })], gates: [GATE], opportunities: [opp(10, 1)] })
    expect(planActive(d, 1, null).gateId).toBeNull()
    expect(planActive(d, 1, null).gateLabel).toMatch(/carries no gate/)
  })

  it('clears all three when the allocation is cleared', () => {
    const p = planActive(data({ allocations: [alloc()], gates: [GATE] }), null, 99)
    expect(p).toMatchObject({ allocationId: null, gateId: null, structureId: null })
  })
})
