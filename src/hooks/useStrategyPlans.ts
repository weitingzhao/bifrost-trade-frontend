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

export function useUpdateStrategyPlan() {
  return usePlanMutation(({ id, payload }: { id: number; payload: Partial<PlanWriteBody> }) =>
    updateStrategyPlan(id, payload),
  )
}

export function useIntendStrategyPlan() {
  return usePlanMutation((id: number) => intendStrategyPlan(id))
}

export function useLinkStrategyPlanFill() {
  return usePlanMutation(({ id, strategyInstanceId }: { id: number; strategyInstanceId: number }) =>
    linkStrategyPlanFill(id, strategyInstanceId),
  )
}
