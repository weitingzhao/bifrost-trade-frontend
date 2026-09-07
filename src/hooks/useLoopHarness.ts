/**
 * TanStack Query hooks for Research Loop harness (objectives + runs).
 * Shared by Harness Console (ops) and Copilot LoopBanner / AgentActionsMenu.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  approveAllRun,
  batchRunObjective,
  curateRun,
  fetchLoopTrust,
  fetchObjectiveRun,
  fetchObjectiveRuns,
  fetchObjectives,
  runObjective,
  fetchAutopilotStanding,
  fetchObjective,
  patchObjective,
  proposePolicyChange,
  type ObjectivePatchBody,
} from '@/api/research/harness'
import { approveResearchDraft } from '@/api/researchDrafts'
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

export function useObjective(objectiveId: string | null) {
  return useQuery({
    queryKey: ['research', 'objective', objectiveId],
    queryFn: () => fetchObjective(objectiveId!),
    enabled: Boolean(objectiveId),
  })
}

export function usePatchObjective() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (v: { objectiveId: string; body: ObjectivePatchBody }) => patchObjective(v.objectiveId, v.body),
    onSuccess: (_d, v) => {
      void queryClient.invalidateQueries({ queryKey: ['research', 'objective', v.objectiveId] })
      void queryClient.invalidateQueries({ queryKey: ['research', 'objectives'] })
      void queryClient.invalidateQueries({ queryKey: ['research', 'loop', 'autopilot'] })
    },
  })
}

/**
 * Change an objective's policy the way the Owner does: propose a draft with a
 * rationale, then approve it. One click for the Owner, and the ledger reads the
 * same as when a model proposes.
 */
export function useChangePolicy() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (v: { objectiveId: string; suggestion: Record<string, unknown>; rationale: string }) => {
      const { draft } = await proposePolicyChange(v.objectiveId, v.suggestion, v.rationale)
      return approveResearchDraft(draft.id)
    },
    onSuccess: (_d, v) => {
      void queryClient.invalidateQueries({ queryKey: ['research', 'objective', v.objectiveId] })
      void queryClient.invalidateQueries({ queryKey: ['research', 'objectives'] })
      void queryClient.invalidateQueries({ queryKey: ['research', 'loop', 'autopilot'] })
      void queryClient.invalidateQueries({ queryKey: ['research', 'drafts'] })
    },
  })
}

export function useAutopilotStanding() {
  return useQuery({
    queryKey: ['research', 'loop', 'autopilot'],
    queryFn: fetchAutopilotStanding,
    refetchInterval: 60_000,
  })
}

export function useLoopTrust() {
  return useQuery({
    queryKey: ['research', 'loop-trust'],
    queryFn: () => fetchLoopTrust(),
    staleTime: 30_000,
    refetchInterval: 60_000,
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

export function useBatchRunObjective() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (objectiveId: string) => batchRunObjective(objectiveId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['research', 'objective-runs'] })
      void queryClient.invalidateQueries({ queryKey: ['research', 'objectives'] })
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.research.drafts })
      void queryClient.invalidateQueries({ queryKey: ['research', 'loop-trust'] })
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

export function useObjectiveRun(runId: string | undefined, opts?: { live?: boolean }) {
  return useQuery({
    queryKey: ['research', 'objective-run', runId],
    queryFn: () => fetchObjectiveRun(runId!),
    enabled: Boolean(runId),
    staleTime: opts?.live ? 0 : 10_000,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status === 'running') return 1500
      if (opts?.live && status == null) return 1500
      return false
    },
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
