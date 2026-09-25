/**
 * How many plans stand in each state — read by Trade › Plans for its filter
 * counts and by the shell's Objective control for a hand objective's Plan
 * stage, so both say the same number.
 */
import type { PlanEffectiveStatus, StrategyPlan } from '@/lib/schemas/strategyPlan'

/** Counts by `effective_status` — so `expired` counts intents past their window, not a stored state. */
export function planFilterCounts(
  plans: readonly StrategyPlan[],
): Record<PlanEffectiveStatus | 'all' | 'open', number> {
  const counts: Record<PlanEffectiveStatus | 'all' | 'open', number> = {
    all: plans.length,
    open: 0,
    draft: 0,
    intended: 0,
    expired: 0,
    filled: 0,
    cancelled: 0,
  }
  for (const plan of plans) counts[plan.effective_status] += 1
  counts.open = counts.draft + counts.intended
  return counts
}
