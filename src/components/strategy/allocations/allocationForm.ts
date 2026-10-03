/** An allocation as its form holds it, and the payload it writes — shared by
 *  the create sheet and the Desk's inspector (design Rev .140). */
import type { AllocationPayload, StrategyAllocation } from '@/types/positions'

export interface AllocationFormState {
  name: string
  opportunityIds: number[]
  gateSetId: number | null
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
  gateSetId: null,
  maxPositions: '',
  maxBpPct: '',
  isActive: true,
}

export function allocationToForm(a: StrategyAllocation): AllocationFormState {
  return {
    name: a.name,
    opportunityIds: a.strategy_opportunity_ids ?? [],
    gateSetId: a.gate_safety_strategy_id ?? null,
    maxPositions: a.max_positions != null ? String(a.max_positions) : '',
    maxBpPct: a.max_bp_pct != null ? String(Math.round(a.max_bp_pct * 10000) / 100) : '',
    isActive: a.is_active ?? true,
  }
}

/** A typed number, or null for an empty or unreadable field. */
function numberOrNull(v: string): number | null {
  if (v.trim() === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/**
 * The write body. The two limits travel inside `allocation_limits` — the API
 * reads them only there, and top-level `max_positions` / `max_bp_pct` were
 * silently dropped, so no limit typed in the form ever saved (debt TD-01).
 * Sent whole on every write: an emptied field clears that limit.
 *
 * `max_bp_pct` is stored as a share of buying power (0.5 = 50%), the way the
 * chain reads it; the form holds the percent a person types.
 */
export function allocationFormToPayload(f: AllocationFormState): AllocationPayload {
  const bpPct = numberOrNull(f.maxBpPct)
  return {
    name: f.name.trim(),
    strategy_opportunity_ids: f.opportunityIds,
    gate_safety_strategy_id: f.gateSetId,
    allocation_limits: {
      max_positions: numberOrNull(f.maxPositions),
      max_bp_pct: bpPct == null ? null : bpPct / 100,
    },
    is_active: f.isActive,
  }
}

export function createAllocationPayload(f: AllocationFormState): AllocationPayload {
  return allocationFormToPayload(f)
}

/** One allocation's own read — the inspector's source, refreshed after each write. */
export const allocationDetailKey = (id: number) => ['strategy', 'allocation', id] as const
