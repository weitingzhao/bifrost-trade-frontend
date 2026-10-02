import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createStrategyPlan,
  fetchStrategyPlans,
  intendStrategyPlan,
  linkStrategyPlanFill,
  updateStrategyPlan,
  type PlanFilters,
  type PlanWriteBody,
} from '@/api/strategyPlans'
import { QUERY_KEYS } from '@/constants/queryKeys'
import type { StrategyPlan, StrategyPlansResponse } from '@/lib/schemas/strategyPlan'

/**
 * Plans read and write through one key, so a card and the table it came from
 * never disagree about a plan's status.
 */
export function useStrategyPlans(filters: PlanFilters = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.strategyPlans.list(filters),
    queryFn: () => fetchStrategyPlans(filters),
    staleTime: 15_000,
  })
}

function usePlanMutation<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.strategyPlans.root })
    },
  })
}

export function useCreateStrategyPlan() {
  return usePlanMutation((payload: PlanWriteBody) => createStrategyPlan(payload))
}

/** Every cached plan list with `plan` in place of its stored copy. */
export function withPlan(old: StrategyPlansResponse | undefined, plan: StrategyPlan): StrategyPlansResponse | undefined {
  if (!old || !Array.isArray(old.items)) return old
  return { ...old, items: old.items.map((p) => (p.strategy_plan_id === plan.strategy_plan_id ? plan : p)) }
}

/**
 * PATCH a plan. The answer is the plan as stored, so the card that sent it
 * reads it at once — Extend 7 days turns an expired plan back into an intent
 * without waiting for the list — and the refetch after is the audit.
 */
export function useUpdateStrategyPlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<PlanWriteBody> }) => updateStrategyPlan(id, payload),
    onSuccess: (plan) => {
      queryClient.setQueriesData<StrategyPlansResponse>({ queryKey: QUERY_KEYS.strategyPlans.root }, (old) =>
        withPlan(old, plan),
      )
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.strategyPlans.root })
    },
  })
}

export function useIntendStrategyPlan() {
  return usePlanMutation((id: number) => intendStrategyPlan(id))
}

export function useLinkStrategyPlanFill() {
  return usePlanMutation(({ id, strategyInstanceId }: { id: number; strategyInstanceId: number }) =>
    linkStrategyPlanFill(id, strategyInstanceId),
  )
}
