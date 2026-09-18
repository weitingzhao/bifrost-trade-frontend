/**
 * Which rule covers a plan — and whether one does at all.
 *
 * Design DECISIONS 2026-09-18: a plan outside the active allocation still goes
 * through, but it says so, because the daemon's book and the hand book have to
 * stay distinguishable. Once they blur, every count on Playbook stats and every
 * gate reading on Risk › Limits is quietly about a different population than
 * the reader thinks.
 *
 * The chain is the same one Trade › Rules draws, so the line links into it with
 * the link already lit rather than restating it.
 */
import type { StrategyAllocation, StrategyOpportunity } from '@/types/strategy'
import type { StrategyPlan } from '@/lib/schemas/strategyPlan'

export interface PlanLineage {
  /** True when nothing in the rulebook covers this plan. */
  outsideRules: boolean
  /** What covers it, or what does not — one sentence, in the register of the page. */
  read: string
  /** The opportunity it runs under, when one covers it. */
  opportunity: { id: number; name: string } | null
  /** The allocation that carries that opportunity, when one does. */
  allocation: { id: number; name: string; active: boolean } | null
  structure: { id: number; name: string } | null
  gateName: string | null
}

export function planLineage(
  plan: StrategyPlan,
  opportunities: readonly StrategyOpportunity[],
  allocations: readonly StrategyAllocation[],
): PlanLineage {
  const opp =
    plan.strategy_opportunity_id == null
      ? null
      : (opportunities.find((o) => o.strategy_opportunity_id === plan.strategy_opportunity_id) ?? null)

  const structure = plan.strategy_structure_id == null
    ? null
    : { id: plan.strategy_structure_id, name: plan.structure_label || `#${plan.strategy_structure_id}` }

  if (opp == null) {
    return {
      outsideRules: true,
      read:
        plan.strategy_opportunity_id == null
          ? `No opportunity covers ${plan.symbol} — a hand plan, outside the daemon’s book. Tracked all the same.`
          : `The opportunity this plan names is no longer in the rulebook, so nothing covers it.`,
      opportunity: null,
      allocation: null,
      structure,
      gateName: null,
    }
  }

  const carrying = allocations.filter((a) => (a.strategy_opportunity_ids ?? []).includes(opp.strategy_opportunity_id))
  const active = carrying.find((a) => a.is_active) ?? null
  const chosen = active ?? carrying[0] ?? null
  const opportunity = { id: opp.strategy_opportunity_id, name: opp.name }
  const allocation =
    chosen == null ? null : { id: chosen.strategy_allocation_id, name: chosen.name, active: chosen.is_active }

  if (chosen == null) {
    return {
      outsideRules: true,
      read: `${opp.name} covers it, but no allocation carries that opportunity — so it runs outside the daemon’s book and inherits no gate.`,
      opportunity,
      allocation: null,
      structure,
      gateName: null,
    }
  }

  if (active == null) {
    return {
      outsideRules: true,
      read: `${opp.name} sits in ${chosen.name}, which is inactive — creating the intent would run outside the rules.`,
      opportunity,
      allocation,
      structure,
      gateName: chosen.gate_safety_name ?? null,
    }
  }

  return {
    outsideRules: false,
    read: `${opp.name}, carried by ${active.name}${active.gate_safety_name ? ` under gate ${active.gate_safety_name}` : ''}.`,
    opportunity,
    allocation,
    structure,
    gateName: active.gate_safety_name ?? null,
  }
}

/**
 * The reserved order route.
 *
 * The design keeps a Send action on every intent and marks it `not wired`
 * (DECISIONS 2026-09-18). Drawn and disabled rather than hidden: the desk
 * copies and TWS places, and a page that simply omits the action reads as
 * "there is no such thing" rather than "it exists and is not connected".
 * D10 governs until it does.
 */
export const SEND_TO_IB = {
  label: 'Send to IB · not wired',
  title: 'Reserved order route — the desk copies, TWS places. D10 governs until it exists.',
} as const
