/**
 * Everything the Journal joins, in one hook.
 *
 * Five queries because the artifacts live in five stores, not because the
 * page wants five panels. The ceilings are the API's own (`le=200` on drafts
 * and hypotheses), and what they cut off is reported rather than swallowed:
 * `reach` carries the oldest day each window still holds, and the page says
 * so under the day picker. A history that silently stops is worse than one
 * that says where it stops.
 */
import { useQuery } from '@tanstack/react-query'
import { fetchObjectiveRuns } from '@/api/research/harness'
import { fetchCandidates } from '@/api/research/candidates'
import { listHypotheses } from '@/api/researchHypothesis'
import { listResearchDrafts, type DraftStatus } from '@/api/researchDrafts'
import { DRAFTS_PAGE_MAX } from '@/hooks/useResearchDrafts'
import { fetchCandidateOutcomeRows } from '@/api/research/candidateOutcome'
import { QUERY_KEYS } from '@/constants/queryKeys'

/** The statuses a history has to include — a dismissed draft still happened. */
const DRAFT_STATUSES: DraftStatus[] = ['pending', 'approved', 'dismissed']

const STALE = 60_000

export function useJournalRuns() {
  return useQuery({
    queryKey: [...QUERY_KEYS.research.objectiveRuns(), 'journal'],
    queryFn: () => fetchObjectiveRuns({ limit: 200 }),
    staleTime: STALE,
    refetchOnWindowFocus: false,
  })
}

export function useJournalCandidates(days: number) {
  return useQuery({
    queryKey: QUERY_KEYS.research.candidates({ status: 'all', days }),
    queryFn: () => fetchCandidates({ status: 'all', days }),
    staleTime: STALE,
    refetchOnWindowFocus: false,
  })
}

export function useJournalHypotheses() {
  return useQuery({
    queryKey: [...QUERY_KEYS.research.hypothesis.list, 'journal'],
    queryFn: () => listHypotheses({ include_retired: true, limit: 200 }),
    staleTime: STALE,
    refetchOnWindowFocus: false,
  })
}

export function useJournalDrafts() {
  return useQuery({
    queryKey: ['research', 'drafts', 'journal'],
    queryFn: async () => {
      const pages = await Promise.all(
        DRAFT_STATUSES.map((status) => listResearchDrafts({ status, limit: DRAFTS_PAGE_MAX })),
      )
      return pages.flatMap((p) => p.rows)
    },
    staleTime: STALE,
    refetchOnWindowFocus: false,
  })
}

export function useJournalOutcomes() {
  return useQuery({
    queryKey: [...QUERY_KEYS.research.candidateOutcome.rows, 'journal'],
    queryFn: async () => (await fetchCandidateOutcomeRows({ limit: 200 })).rows,
    staleTime: STALE,
    refetchOnWindowFocus: false,
  })
}
