import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  cancelStrategyPlan,
  createStrategyPlan,
  fetchStrategyPlan,
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
    queryKey: [
      ...QUERY_KEYS.strategyPlans.list,
      filters.status ?? null,
      filters.symbol ?? null,
      filters.accountId ?? null,
      filters.limit ?? null,
    ] as const,
    queryFn: () => fetchStrategyPlans(filters),
    staleTime: 15_000,
  })
}

export function useStrategyPlan(id: number | null | undefined, enabled = true) {
  return useQuery({
    queryKey: [...QUERY_KEYS.strategyPlans.detail, id] as const,
    queryFn: () => fetchStrategyPlan(id!),
    enabled: enabled && id != null && id > 0,
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

export function useCancelStrategyPlan() {
  return usePlanMutation((id: number) => cancelStrategyPlan(id))
}
