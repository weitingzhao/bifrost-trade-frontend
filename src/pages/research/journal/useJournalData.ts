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
    queryKey: [...QUERY_KEYS.researchEngine.objectiveRuns(), 'journal'],
    queryFn: () => fetchObjectiveRuns({ limit: 200 }),
    staleTime: STALE,
    refetchOnWindowFocus: false,
  })
}

export function useJournalCandidates(days: number) {
  return useQuery({
    queryKey: QUERY_KEYS.researchEngine.candidates({ status: 'all', days }),
    queryFn: () => fetchCandidates({ status: 'all', days }),
    staleTime: STALE,
    refetchOnWindowFocus: false,
  })
}

export function useJournalHypotheses() {
  return useQuery({
    queryKey: [...QUERY_KEYS.researchEngine.hypothesis.list, 'journal'],
    queryFn: () => listHypotheses({ include_retired: true, limit: 200 }),
    staleTime: STALE,
    refetchOnWindowFocus: false,
  })
}

export function useJournalDrafts() {
  return useQuery({
    queryKey: ['research-engine', 'drafts', 'journal'],
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

/**
 * Settled rows for the Journal's Right / Wrong split.
 *
 * `source: ''` is every nomination source (measured: the same as omitting it).
 * `days` is the candidate window, the same parameter `/summary` uses, so the
 * split is not the newest 200 rows with no date bound. The API caps `limit`
 * at 500; the 30-day window on DEV 2026-10-07 was 166 rows.
 */
export function journalOutcomeQuery(days: number) {
  return { source: '', days, limit: 500 }
}

export function useJournalOutcomes(days: number) {
  return useQuery({
    queryKey: [...QUERY_KEYS.researchEngine.candidateOutcome.rows, 'journal', days],
    queryFn: async () => (await fetchCandidateOutcomeRows(journalOutcomeQuery(days))).rows,
    staleTime: STALE,
    refetchOnWindowFocus: false,
  })
}
