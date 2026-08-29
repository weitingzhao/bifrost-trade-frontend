/**
 * TanStack Query wrappers for Candidate Pool (Research Loop v1).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addCandidates,
  dismissCandidate,
  fetchCandidates,
  promoteCandidate,
  type CandidateCreateItem,
  type PromoteCandidateBody,
} from '@/api/research/candidates'
import { QUERY_KEYS } from '@/constants/queryKeys'

export type CandidatesQueryParams = {
  status?: string
  source?: string
  days?: number
}

export function useCandidates(params: CandidatesQueryParams = {}, enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.research.candidates(params),
    queryFn: () => fetchCandidates(params),
    enabled,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  })
}

function invalidateCandidateCaches(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['research', 'candidates'] })
}

export function useAddCandidates() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (items: CandidateCreateItem[]) => addCandidates(items),
    onSuccess: () => invalidateCandidateCaches(queryClient),
  })
}

export function usePromoteCandidate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: { id: string; body?: PromoteCandidateBody }) =>
      promoteCandidate(args.id, args.body),
    onSuccess: () => {
      invalidateCandidateCaches(queryClient)
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.research.hypothesis.list })
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.research.hypothesis.summaryActive })
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.research.home })
    },
  })
}

export function useDismissCandidate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => dismissCandidate(id),
    onSuccess: () => invalidateCandidateCaches(queryClient),
  })
}
