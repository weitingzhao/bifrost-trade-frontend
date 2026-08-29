/**
 * TanStack Query hooks for Research Cockpit draft inbox (Wave RS-E3).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  approveResearchDraft,
  createResearchDraft,
  dismissResearchDraft,
  listResearchDrafts,
  runEodAgent,
  runMorningAgent,
  type CreateResearchDraftBody,
  type DraftKind,
  type DraftStatus,
} from '@/api/researchDrafts'

export const researchDraftsQueryKey = ['research', 'drafts'] as const

export function useResearchDrafts(opts?: {
  status?: DraftStatus
  kind?: DraftKind
  refetchIntervalMs?: number
}) {
  const status = opts?.status ?? 'pending'
  const kind = opts?.kind
  return useQuery({
    queryKey: [...researchDraftsQueryKey, status, kind ?? 'all'],
    queryFn: () => listResearchDrafts({ status, kind, limit: 50 }),
    refetchInterval: opts?.refetchIntervalMs ?? 30_000,
    staleTime: 10_000,
  })
}

export function usePendingDraftCount() {
  const q = useResearchDrafts({ status: 'pending' })
  return {
    count: q.data?.pending_count ?? q.data?.count ?? 0,
    isLoading: q.isLoading,
    refetch: q.refetch,
  }
}

export function useApproveDraft() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => approveResearchDraft(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: researchDraftsQueryKey })
      void qc.invalidateQueries({ queryKey: ['research', 'hypothesis'] })
    },
  })
}

export function useDismissDraft() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => dismissResearchDraft(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: researchDraftsQueryKey })
    },
  })
}

export function useCreateResearchDraft() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateResearchDraftBody) => createResearchDraft(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: researchDraftsQueryKey })
    },
  })
}

export function useRunMorningAgent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => runMorningAgent(false),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: researchDraftsQueryKey })
    },
  })
}

export function useRunEodAgent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => runEodAgent(false),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: researchDraftsQueryKey })
    },
  })
}
