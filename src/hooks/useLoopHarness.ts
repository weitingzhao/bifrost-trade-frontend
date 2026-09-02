/**
 * TanStack Query hooks for Research Loop harness (objectives + runs).
 * Shared by Harness Console (ops) and Copilot LoopBanner / AgentActionsMenu.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  approveAllRun,
  curateRun,
  fetchObjectiveRun,
  fetchObjectiveRuns,
  fetchObjectives,
  runObjective,
} from '@/api/research/harness'
import {
  createPolicyTemplate,
  deletePolicyTemplate,
  fetchPolicyTemplates,
  patchPolicyTemplate,
} from '@/api/research/policyTemplate'
import { QUERY_KEYS } from '@/constants/queryKeys'

export function useActiveObjectives() {
  return useQuery({
    queryKey: QUERY_KEYS.research.objectives({ status: 'active' }),
    queryFn: () => fetchObjectives({ status: 'active' }),
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  })
}

export function useAwaitingRuns() {
  return useQuery({
    queryKey: QUERY_KEYS.research.objectiveRuns({ status: 'awaiting_approval' }),
    queryFn: () => fetchObjectiveRuns({ status: 'awaiting_approval', limit: 10 }),
    staleTime: 10_000,
    refetchInterval: 15_000,
    refetchOnWindowFocus: false,
  })
}

export function useRunObjective() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (objectiveId: string) => runObjective(objectiveId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['research', 'objective-runs'] })
      void queryClient.invalidateQueries({ queryKey: ['research', 'objectives'] })
    },
  })
}

export function useCurateRun() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (runId: string) => curateRun(runId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['research', 'objective-runs'] })
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.research.drafts })
    },
  })
}

export function useObjectiveRun(runId: string | undefined) {
  return useQuery({
    queryKey: ['research', 'objective-run', runId],
    queryFn: () => fetchObjectiveRun(runId!),
    enabled: Boolean(runId),
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  })
}

export function useApproveAllRun() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (runId: string) => approveAllRun(runId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['research', 'objective-runs'] })
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.research.drafts })
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.research.hypothesis.list })
      void queryClient.invalidateQueries({ queryKey: ['research', 'candidates'] })
    },
  })
}

// --- Policy templates (P0-2) ---
// The Loop's strategy is data now, not a constant compiled into two codebases.

export function usePolicyTemplates() {
  return useQuery({
    queryKey: ['research', 'policy-templates'],
    queryFn: () => fetchPolicyTemplates(),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}

export function useSavePolicyTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (v: {
      id?: string
      name: string
      description: string
      policy_json: Record<string, unknown>
      is_default: boolean
    }) =>
      v.id
        ? patchPolicyTemplate(v.id, {
            name: v.name,
            description: v.description,
            policy_json: v.policy_json,
            is_default: v.is_default,
          })
        : createPolicyTemplate({
            name: v.name,
            description: v.description,
            policy_json: v.policy_json,
            is_default: v.is_default,
          }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['research', 'policy-templates'] })
    },
  })
}

export function useDeletePolicyTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deletePolicyTemplate(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['research', 'policy-templates'] })
    },
  })
}
