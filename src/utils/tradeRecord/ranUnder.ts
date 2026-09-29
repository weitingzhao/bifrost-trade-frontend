import type { GateSafetyItem, StrategyAllocation } from '@/types/strategy'

export interface RanUnder {
  alloc: string
  /** Ran outside the rules — no allocation carries its opportunity, so no gate either. */
  warn: boolean
}

/** The allocation and gate an instance's opportunity ran under, as the instance face words it. */
export function ranUnderOf(
  opportunityId: number | null | undefined,
  allocations: readonly StrategyAllocation[],
  gates: readonly GateSafetyItem[],
): RanUnder {
  const al =
    opportunityId != null ? allocations.find((a) => (a.strategy_opportunity_ids ?? []).includes(opportunityId)) : undefined
  const g = al ? gates.find((x) => x.gate_safety_strategy_id === al.gate_safety_strategy_id) : undefined
  return al
    ? { alloc: `in ${al.name} · gate ${g ? `${g.name} v${g.version}` : 'none'}`, warn: false }
    : { alloc: 'in no allocation — ran outside rules, no gate', warn: true }
}
