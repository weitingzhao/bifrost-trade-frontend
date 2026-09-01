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
