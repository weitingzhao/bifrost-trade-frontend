import { describe, expect, it } from 'vitest'
import type { StrategyAllocation } from '@/types/strategy'
import { runningGate } from './useLimitBook'

// Invented allocations (fixtures are never copied from DEV).
const alloc = (id: number, gate: number | null, is_active = true): StrategyAllocation => ({
  strategy_allocation_id: id,
  name: `A${id}`,
  strategy_opportunity_ids: [],
  gate_safety_strategy_id: gate,
  is_active,
  created_at: null,
  updated_at: null,
})

describe('runningGate', () => {
  it('takes what the daemon settings point at, not the first allocation on the books', () => {
    const books = [alloc(1, 10), alloc(2, 20)]
    const got = runningGate(books, { allocation: { id: 2 }, gate_safety: { id: 20 } })
    expect(got.allocation?.strategy_allocation_id).toBe(2)
    expect(got.gateId).toBe(20)
  })

  it('reads no gate when the settings carry none — the daemon then runs its config file', () => {
    const got = runningGate([alloc(1, 10)], { allocation: { id: null }, gate_safety: { id: null } })
    expect(got).toEqual({ allocation: null, gateId: null })
    expect(runningGate([alloc(1, 10)], undefined)).toEqual({ allocation: null, gateId: null })
  })
})
