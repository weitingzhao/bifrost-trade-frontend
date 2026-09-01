import { useQuery } from '@tanstack/react-query'
import {
  fetchCandidateOutcomeRows,
  fetchCandidateOutcomeSummary,
  type CandidateOutcomeRow,
  type CandidateOutcomeSummary,
} from '@/api/research/candidateOutcome'
import { QUERY_KEYS } from '@/constants/queryKeys'

/** Hit rate per horizon for candidates the Loop proposed. */
export function useCandidateOutcomeSummary(params: { source?: string; days?: number } = {}) {
  return useQuery<CandidateOutcomeSummary>({
    queryKey: [...QUERY_KEYS.research.candidateOutcome.summary, params.source ?? '', params.days ?? 90],
    queryFn: () => fetchCandidateOutcomeSummary(params),
    staleTime: 5 * 60_000,
  })
}

/** Settled legs, keyed by candidate id for table joins. */
export function useCandidateOutcomeByCandidate(horizonDays = 5) {
  return useQuery<Map<string, CandidateOutcomeRow>>({
    queryKey: [...QUERY_KEYS.research.candidateOutcome.rows, horizonDays],
    queryFn: async () => {
      const { rows } = await fetchCandidateOutcomeRows({ horizonDays, limit: 500 })
      return new Map(rows.map((r) => [r.candidate_id, r]))
    },
    staleTime: 5 * 60_000,
  })
}
