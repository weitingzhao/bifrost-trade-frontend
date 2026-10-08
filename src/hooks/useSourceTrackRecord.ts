/**
 * The candidate-outcome record by nomination source — where a candidate came
 * from, not which judge graded it (nothing records a judge's verdict against
 * the outcome that followed). Two readers since design Rev .104: the Personas
 * Track record table and the Pilot Console's bench strip, which the design
 * turned into "Track record · by source" on the app's receipt (Q8). One read
 * here so the two can never disagree about a hit rate (§14.2).
 */
import { useMemo } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import {
  fetchCandidateOutcomeRows,
  fetchCandidateOutcomeSummary,
  type CandidateOutcomeSummary,
} from '@/api/research/candidateOutcome'

/** The window the record is read over. A year of a book this size is ~100 settled rows. */
export const TRACK_DAYS = 365
/** Under this many settled, a hit rate is a coincidence. The design's own line. */
export const TRACK_THIN = 10

export function horizonOf(summary: CandidateOutcomeSummary | undefined, days: number) {
  return summary?.horizons?.find((h) => h.horizon_days === days) ?? null
}

/** A source as the operator who owns it — `harness` is the loop. */
export function sourceLabel(source: string): string {
  return source === 'harness' ? 'loop' : source
}

export function useSourceTrackRecord(days = TRACK_DAYS) {
  // One read to learn which sources the store attributes. `/rows` honors
  // `source` and `days` (the same meaning as `/summary`); this call omits
  // both so every source in the window is visible, then the summary is asked
  // for one source at a time.
  const rowsQuery = useQuery({
    queryKey: ['research-engine', 'candidate-outcome', 'sources', days],
    queryFn: () => fetchCandidateOutcomeRows({ days, limit: 500 }),
    staleTime: 10 * 60_000,
  })
  const sources = useMemo(() => {
    const seen = new Map<string, number>()
    for (const r of rowsQuery.data?.rows ?? []) {
      const s = (r.source ?? '').trim()
      if (s) seen.set(s, (seen.get(s) ?? 0) + 1)
    }
    return [...seen.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => s)
  }, [rowsQuery.data])
  // The numbers are the server's, per source — not re-derived from the rows
  // above, so this record and Signal Decay cannot disagree about a hit rate.
  const summaries = useQueries({
    queries: sources.map((source) => ({
      queryKey: ['research-engine', 'candidate-outcome', 'summary', source, days, 'by-regime'],
      queryFn: () => fetchCandidateOutcomeSummary({ source, days, byRegime: true }),
      staleTime: 10 * 60_000,
    })),
  })
  const rows = sources.map((source, i) => ({ source, summary: summaries[i]?.data }))
  return {
    rows,
    loading: rowsQuery.isLoading || summaries.some((q) => q.isLoading),
    error: rowsQuery.isError ? rowsQuery.error : null,
  }
}
