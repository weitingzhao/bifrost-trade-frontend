/**
 * Hypothesis workflow hooks (Wave RS-A).
 *
 * Thin TanStack Query wrappers around `src/api/researchHypothesis.ts`.
 * Mutations invalidate the shared `research.hypothesis` cache keys so Home
 * cards and per-page lists refresh in lock step.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createHypothesis,
  fetchActiveSummary,
  getHypothesis,
  listHypotheses,
  patchHypothesis,
  retireHypothesis,
  type Hypothesis,
  type HypothesisCreateInput,
  type HypothesisPatchInput,
  type ListHypothesesQuery,
} from '@/api/researchHypothesis'
import { QUERY_KEYS } from '@/constants/queryKeys'

export function useHypothesisList(opts: ListHypothesesQuery = {}, enabled = true) {
  return useQuery({
    queryKey: [...QUERY_KEYS.research.hypothesis.list, opts],
    queryFn: () => listHypotheses(opts),
    enabled,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  })
}

export function useActiveHypotheses(topN = 5, enabled = true) {
  return useQuery({
    queryKey: [...QUERY_KEYS.research.hypothesis.summaryActive, topN],
    queryFn: () => fetchActiveSummary(topN),
    enabled,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  })
}

export function useHypothesis(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: id ? QUERY_KEYS.research.hypothesis.byId(id) : ['research', 'hypothesis', 'idle'],
    queryFn: () => (id ? getHypothesis(id) : Promise.reject(new Error('missing id'))),
    enabled: Boolean(id) && enabled,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  })
}

function invalidateHypothesisCaches(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.research.hypothesis.list })
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.research.hypothesis.summaryActive })
  queryClient.invalidateQueries({ queryKey: ['research', 'hypothesis', 'active'] })
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.research.home })
}

export function useCreateHypothesis() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: HypothesisCreateInput) => createHypothesis(input),
    onSuccess: () => invalidateHypothesisCaches(queryClient),
  })
}

export function usePatchHypothesis() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: { id: string; patch: HypothesisPatchInput }) =>
      patchHypothesis(args.id, args.patch),
    onSuccess: (updated: Hypothesis) => {
      invalidateHypothesisCaches(queryClient)
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.research.hypothesis.byId(updated.id) })
    },
  })
}

export function useRetireHypothesis() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => retireHypothesis(id),
    onSuccess: (updated: Hypothesis) => {
      invalidateHypothesisCaches(queryClient)
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.research.hypothesis.byId(updated.id) })
    },
  })
}
