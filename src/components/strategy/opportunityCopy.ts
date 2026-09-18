/**
 * A copy of an opportunity, as the form takes it.
 *
 * Shared since 2026-09-18: Trade › Rules duplicates one from the chain and
 * Strategy › Opportunity has always had a Copy row action. Both go through this
 * so a copy made from either side is the same opportunity — the same structure,
 * the same gate, the same scope and the same entry conditions, under a name
 * that says it is a copy.
 *
 * The detail is fetched rather than taken from the list row: the list carries
 * neither the symbols nor the entry conditions, and a copy missing its
 * conditions would be a different rule wearing the same name.
 */
import { fetchOpportunityDetail } from '@/api/strategy'
import type { PrefillData } from '@/components/strategy/OpportunityFormModal'

/** Query key for the detail, shared so a copy reuses whatever is already cached. */
export function opportunityDetailKey(id: number) {
  return ['strategy', 'opportunity-detail', id] as const
}

export function opportunityCopyPrefill(detail: Awaited<ReturnType<typeof fetchOpportunityDetail>>): PrefillData {
  return {
    name: `${detail.name} (copy)`,
    structureId: detail.strategy_structure_id != null ? String(detail.strategy_structure_id) : '',
    gateSafetyId:
      detail.default_gate_safety_strategy_id != null ? String(detail.default_gate_safety_strategy_id) : '',
    scopeType: detail.scope_type ?? '',
    symbols: detail.symbols ?? [],
    conditions: detail.entry_conditions ?? [],
  }
}
