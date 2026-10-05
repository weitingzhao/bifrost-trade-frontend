/**
 * The Loop as one closed circuit, and how much has moved through each segment.
 *
 * Every page in Research shows one segment: the Console shows runs, the Inbox
 * shows drafts, the Hypothesis Board shows what was acted on. Nothing shows the
 * circuit, and the circuit is where the interesting facts live — a system that
 * proposes briskly and settles nothing looks healthy on every individual page
 * and is not learning at all.
 *
 * Fanned out across the endpoints that already exist rather than served by a new
 * one. That is deliberate for now: the shape should earn a backend endpoint by
 * proving it is worth looking at, not the other way round.
 */
import { useQueries } from '@tanstack/react-query'
import { fetchObjectiveRuns, fetchObjectives } from '@/api/research/harness'
import { fetchCandidateOutcomeSummary } from '@/api/research/candidateOutcome'
import { listResearchDrafts } from '@/api/researchDrafts'
import { listHypotheses } from '@/api/researchHypothesis'
import { isRuleResolved } from '@/lib/hypothesisResolution'
import { firstResearchAuthGapError } from '@/lib/auth/researchAuthGap'

/** Business window. Cumulative counts flatter a loop that stopped weeks ago. */
export const LOOP_WINDOW_DAYS = 30

export interface LoopSegment {
  id: 'system' | 'screen' | 'decide' | 'act' | 'learn'
  /** What this segment is, in the terms the Owner uses — not the table name. */
  label: string
  /** The number that says how much moved through it in the window. */
  value: number | null
  unit: string
  /** Why it is that number, in one line. */
  detail: string
  /** True when this segment is where the circuit is thinnest. */
  starved: boolean
}

export interface LoopOverview {
  windowDays: number
  segments: LoopSegment[]
  /**
   * The feedback edge: suggestions raised to change the rules, and taken up.
   * Null when the drafts could not be read — a refused read is not zero.
   */
  feedback: { raised: number | null; taken: number | null }
  isLoading: boolean
  isError: boolean
  /** The first 401 among the reads: the Research user is not set (or was refused). */
  authError: unknown
}

/**
 * The segments that count drafts, unread. On a 401 the drafts queries hold no
 * data, and counting their missing rows as none said "0 batches waiting" to a
 * reader who was simply not signed in.
 */
export function blankDraftSegments(segments: LoopSegment[], why: string): LoopSegment[] {
  return blankSegments(segments, ['decide', 'act'], why)
}

/**
 * Any segments, unread. The same reasoning for every read the strip fans out
 * to: a refused objectives list is not "no active objective" (and not starved),
 * refused runs are not "0 runs", refused outcomes are not "0 judged".
 */
export function blankSegments(
  segments: LoopSegment[],
  ids: readonly LoopSegment['id'][],
  why: string,
): LoopSegment[] {
  return segments.map((s) => (ids.includes(s.id) ? { ...s, value: null, detail: why, starved: false } : s))
}

export interface LoopInputs {
  objectiveTitles: string[]
  runStartedAt: (string | null | undefined)[]
  pendingBatches: number
  approvedBatches: number
  tracked: number
  settled: number
  judged: number
  /** Theses the outcome rule settled without a click (B3). */
  resolvedByRule?: number
  now?: number
}

/**
 * The segment counts, as a pure function of what the endpoints returned.
 *
 * Separated from the fetching so the arithmetic that decides whether the loop
 * looks healthy can be tested directly. It is the part worth getting right: a
 * miscounted segment here would understate exactly the gap this view exists to
 * expose.
 */
export function deriveLoopSegments(input: LoopInputs, windowDays: number): LoopSegment[] {
  const runs = input.runStartedAt.filter((t) => withinWindow(t, windowDays, input.now))
  return [
    {
      id: 'system',
      label: 'Your rules',
      value: input.objectiveTitles.length,
      unit: input.objectiveTitles.length === 1 ? 'system' : 'systems',
      detail: input.objectiveTitles.join(' · ') || 'no active objective',
      starved: input.objectiveTitles.length === 0,
    },
    {
      id: 'screen',
      label: 'Screened the market',
      value: runs.length,
      unit: runs.length === 1 ? 'run' : 'runs',
      detail: `${windowDays}-day window`,
      starved: runs.length === 0,
    },
    {
      id: 'decide',
      label: 'Waiting on you',
      value: input.pendingBatches,
      unit: 'batches',
      detail: `${input.approvedBatches} approved so far`,
      starved: false,
    },
    {
      id: 'act',
      label: 'Acted on',
      value: input.approvedBatches,
      unit: 'batches',
      detail:
        input.pendingBatches > 0
          ? `${input.pendingBatches} more never decided`
          : 'nothing queued',
      starved: input.approvedBatches === 0,
    },
    {
      id: 'learn',
      label: 'Came back scored',
      value: input.judged,
      unit: 'judged',
      detail:
        `${input.tracked} tracked · ${input.settled} reached their horizon` +
        (input.resolvedByRule ? ` · ${input.resolvedByRule} theses settled by rule` : ''),
      starved: input.judged === 0,
    },
  ]
}

function withinWindow(iso: string | null | undefined, days: number, now?: number): boolean {
  if (!iso) return false
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return false
  return (now ?? Date.now()) - t <= days * 24 * 60 * 60 * 1000
}

export function useLoopOverview(windowDays: number = LOOP_WINDOW_DAYS): LoopOverview {
  const results = useQueries({
    queries: [
      {
        queryKey: ['loop-overview', 'objectives'],
        queryFn: () => fetchObjectives({ status: 'active' }),
        staleTime: 60_000,
      },
      {
        queryKey: ['loop-overview', 'runs'],
        queryFn: () => fetchObjectiveRuns({}),
        staleTime: 60_000,
      },
      {
        queryKey: ['loop-overview', 'batches', 'pending'],
        queryFn: () => listResearchDrafts({ status: 'pending', kind: 'candidate_batch', limit: 200 }),
        staleTime: 60_000,
      },
      {
        queryKey: ['loop-overview', 'batches', 'approved'],
        queryFn: () =>
          listResearchDrafts({ status: 'approved', kind: 'candidate_batch', limit: 200 }),
        staleTime: 60_000,
      },
      {
        queryKey: ['loop-overview', 'outcomes', windowDays],
        queryFn: () => fetchCandidateOutcomeSummary({ days: windowDays }),
        staleTime: 60_000,
      },
      {
        queryKey: ['loop-overview', 'suggestions', 'pending'],
        queryFn: () =>
          listResearchDrafts({ status: 'pending', kind: 'policy_suggestion', limit: 200 }),
        staleTime: 60_000,
      },
      {
        queryKey: ['loop-overview', 'suggestions', 'approved'],
        queryFn: () =>
          listResearchDrafts({ status: 'approved', kind: 'policy_suggestion', limit: 200 }),
        staleTime: 60_000,
      },
      {
        queryKey: ['loop-overview', 'hypotheses', 'validated'],
        queryFn: () => listHypotheses({ status: 'validated', limit: 200 }),
        staleTime: 60_000,
      },
      {
        queryKey: ['loop-overview', 'hypotheses', 'rejected'],
        queryFn: () => listHypotheses({ status: 'rejected', limit: 200 }),
        staleTime: 60_000,
      },
    ],
  })

  const [objectivesQ, runsQ, pendingQ, approvedQ, outcomesQ, sugPendingQ, sugApprovedQ, validatedQ, rejectedQ] =
    results
  const isLoading = results.some((r) => r.isLoading)
  const isError = results.some((r) => r.isError)
  const authError = firstResearchAuthGapError(...results.map((r) => r.error))
  const draftsUnread = [pendingQ, approvedQ, sugPendingQ, sugApprovedQ].some((q) => q.data == null)

  const objectives = objectivesQ.data?.items ?? []
  const runs = runsQ.data?.items ?? []
  const pendingBatches = pendingQ.data?.rows ?? []
  const approvedBatches = approvedQ.data?.rows ?? []
  const outcomes = outcomesQ.data
  const suggestionsRaised = sugPendingQ.data ? sugPendingQ.data.rows.length : null
  const suggestionsTaken = sugApprovedQ.data ? sugApprovedQ.data.rows.length : null

  // A horizon is settled when the holding period elapsed; judged when it was
  // actually scored. Settled-but-unjudged is the queue, not the result.
  const settled = (outcomes?.horizons ?? []).reduce((n, h) => n + (h.settled ?? 0), 0)
  const judged = (outcomes?.horizons ?? []).reduce((n, h) => n + (h.judged ?? 0), 0)
  const tracked = outcomes?.candidates ?? 0
  // Only theses with a receipt count: a status someone clicked is a decision,
  // not the loop learning on its own.
  const resolvedByRule = [...(validatedQ.data?.rows ?? []), ...(rejectedQ.data?.rows ?? [])].filter(
    (h) => isRuleResolved(h) && withinWindow(h.updated_at, windowDays),
  ).length

  const counted = deriveLoopSegments(
    {
      objectiveTitles: objectives.map((o) => o.title),
      runStartedAt: runs.map((r) => r.started_at),
      pendingBatches: pendingBatches.length,
      approvedBatches: approvedBatches.length,
      tracked,
      settled,
      judged,
      resolvedByRule,
    },
    windowDays,
  )
  // Each segment rests on its own reads; one that answered nothing is «—».
  const why = (what: string) => (authError ? `${what} not read — Research user not set` : `${what} could not be read`)
  let segments = counted
  if (!isLoading) {
    if (draftsUnread) segments = blankDraftSegments(segments, why('drafts'))
    if (objectivesQ.data == null) segments = blankSegments(segments, ['system'], why('objectives'))
    if (runsQ.data == null) segments = blankSegments(segments, ['screen'], why('runs'))
    if (outcomesQ.data == null) segments = blankSegments(segments, ['learn'], why('outcomes'))
  }

  return {
    windowDays,
    segments,
    feedback: { raised: suggestionsRaised, taken: suggestionsTaken },
    isLoading,
    isError,
    authError,
  }
}
