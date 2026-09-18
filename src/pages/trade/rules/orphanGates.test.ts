import { describe, expect, it } from 'vitest'
import { orphanGates } from './rulesChain'
import type { ChainData } from '@/hooks/useRulesChain'
import type { GateSafetyItem, StrategyAllocation } from '@/types/strategy'

function gate(id: number, name: string): GateSafetyItem {
  return { gate_safety_strategy_id: id, name, version: 1 } as GateSafetyItem
}

function alloc(gateId: number | null): StrategyAllocation {
  return { strategy_allocation_id: 1, name: 'A', gate_safety_strategy_id: gateId } as StrategyAllocation
}

function data(p: Partial<ChainData> = {}): ChainData {
  return { structures: [], opportunities: [], allocations: [], gates: [], instances: [], ...p }
}

describe('orphanGates', () => {
  it('finds a gate no allocation carries — the chain draws gates through allocations, so it would show nowhere', () => {
    const d = data({ gates: [gate(1, 'Security Gate'), gate(2, 'Security Gate (Deactivate)')], allocations: [alloc(1)] })
    expect(orphanGates(d).map((g) => g.name)).toEqual(['Security Gate (Deactivate)'])
  })

  it('has nothing to say when every gate is carried', () => {
    expect(orphanGates(data({ gates: [gate(1, 'G')], allocations: [alloc(1)] }))).toEqual([])
  })

  it('counts a gate as loose when the allocation that could carry it carries none', () => {
    expect(orphanGates(data({ gates: [gate(1, 'G')], allocations: [alloc(null)] })).map((g) => g.name)).toEqual(['G'])
  })

  it('calls every gate loose when there are no allocations at all', () => {
    expect(orphanGates(data({ gates: [gate(1, 'G'), gate(2, 'H')] }))).toHaveLength(2)
  })
})
