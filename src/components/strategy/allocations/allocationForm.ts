/** An allocation as its form holds it, and the payload it writes — shared by
 *  the create sheet and the Desk's inspector (design Rev .140). */
import type { AllocationPayload, StrategyAllocation } from '@/types/positions'

export interface AllocationFormState {
  name: string
  opportunityIds: number[]
  gateSafetyId: number | null
  maxPositions: string
  maxBpPct: string
  /**
   * On the books — whether this allocation may be picked at all. A different
   * fact from the one the daemon's config holds about which allocation it
   * runs, which is `Set active` on Trading › Rules. Edited here because it is
   * part of the definition; until 2026-09-18 it was editable on the retiring
   * Strategy › Allocations page and nowhere else, so an allocation taken off
   * the books could not be put back from the chain.
   */
  isActive: boolean
}

export const EMPTY_ALLOCATION_FORM: AllocationFormState = {
  name: '',
  opportunityIds: [],
  gateSafetyId: null,
  maxPositions: '',
  maxBpPct: '',
  isActive: true,
}

export function allocationToForm(a: StrategyAllocation): AllocationFormState {
  return {
    name: a.name,
    opportunityIds: a.strategy_opportunity_ids ?? [],
    gateSafetyId: a.gate_safety_strategy_id ?? null,
    maxPositions: a.max_positions != null ? String(a.max_positions) : '',
    maxBpPct: a.max_bp_pct != null ? String(a.max_bp_pct) : '',
    isActive: a.is_active ?? true,
  }
}

export function allocationFormToPayload(f: AllocationFormState): AllocationPayload {
  return {
    name: f.name.trim(),
    strategy_opportunity_ids: f.opportunityIds,
    gate_safety_strategy_id: f.gateSafetyId,
    max_positions: f.maxPositions !== '' ? Number(f.maxPositions) : null,
    max_bp_pct: f.maxBpPct !== '' ? Number(f.maxBpPct) : null,
    is_active: f.isActive,
  }
}

export function createAllocationPayload(f: AllocationFormState): AllocationPayload {
  return allocationFormToPayload(f)
}

/** One allocation's own read — the inspector's source, refreshed after each write. */
export const allocationDetailKey = (id: number) => ['strategy', 'allocation', id] as const
