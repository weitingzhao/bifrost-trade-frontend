/**
 * The Desk's editing rules that need no React (design Rev .140): what a chain
 * reads like with held deletes gone, and why a gate set may not go.
 */
import type { ChainData } from '@/hooks/useRulesChain'
import type { StrategyInstance } from '@/types/strategy'

export interface Held {
  opportunity: (id: number) => boolean
  allocation: (id: number) => boolean
  gate: (id: number) => boolean
  instance: (id: number) => boolean
}

/** The chain with the held deletes already gone — a held opportunity leaves its allocations too. */
export function withoutHeld(data: ChainData, rawInstances: readonly StrategyInstance[], held: Held) {
  return {
    data: {
      ...data,
      opportunities: data.opportunities.filter((o) => !held.opportunity(o.strategy_opportunity_id)),
      allocations: data.allocations
        .filter((a) => !held.allocation(a.strategy_allocation_id))
        .map((a) => ({
          ...a,
          strategy_opportunity_ids: (a.strategy_opportunity_ids ?? []).filter((id) => !held.opportunity(id)),
        })),
      gates: data.gates.filter((g) => !held.gate(g.gate_safety_strategy_id)),
      instances: data.instances.filter((i) => !held.instance(i.id)),
    },
    rawInstances: rawInstances.filter((r) => !held.instance(r.strategy_instance_id)),
  }
}

/** Why a gate set cannot be deleted, in the server's terms — or null. */
export function gateInUseReason(data: ChainData, id: number, daemonGateId: number | null): string | null {
  const opps = data.opportunities.filter((o) => o.default_gate_safety_strategy_id === id).length
  const allocs = data.allocations.filter((a) => a.gate_safety_strategy_id === id).length
  if (opps || allocs) {
    const who = [
      opps ? `${opps} ${opps === 1 ? 'opportunity' : 'opportunities'}` : '',
      allocs ? `${allocs} ${allocs === 1 ? 'allocation' : 'allocations'}` : '',
    ]
      .filter(Boolean)
      .join(' and ')
    return `${who} ${opps + allocs === 1 ? 'uses' : 'use'} it — point them at another gate set first.`
  }
  return daemonGateId === id ? "The daemon's settings use this gate set — set another one active first." : null
}
