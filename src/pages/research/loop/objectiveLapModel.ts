/**
 * One objective's lap around the loop — the six stations, counted.
 *
 * Design: `Research Objective.dc.html` (Rev 2026-09-20.7) and Vision §20. The
 * strip answers a question the KPI row does not: not "how is this machine
 * doing" but "where is its work right now". Each station holds *this
 * objective's* stock at that step, so a machine that nominates plenty and
 * settles nothing has a shape you can see rather than a number you have to
 * infer.
 *
 * Two of the six cross into the outer loop — Settle and Feed back are where
 * research meets the account and the policy — and the design marks them,
 * because that crossing is the thing D10 keeps under the Owner's hand.
 *
 * Empty is a reading. A draft objective that has never run shows four empty
 * stations, and that shape *is* its status; hiding the empties would turn it
 * into a page with nothing on it.
 *
 * The counting is here, away from React, because each station is a different
 * join and every one of them was measured on DEV before it was written:
 *
 *   Scan       the universe the last run opened (`last_memo.considered`)
 *   Nominate   pool rows whose `source_ref.objective_id` is this one
 *   Judge      memos awaiting a verdict (`pending_memos`)
 *   Decide     hypotheses whose `origin_ref.run_id` is one of its runs
 *   Settle     the track record: judged, hit rate, still pending
 *   Feed back  pending policy_suggestion drafts carrying its id
 */
import type { AutopilotObjective } from '@/api/research/harness'
import type { ResearchCandidate } from '@/api/research/candidates'
import type { Hypothesis } from '@/api/researchHypothesis'
import type { AiDraft } from '@/api/researchDrafts'
import { fmtPct0 } from '@/utils/positions'

export type StationId = 'scan' | 'nominate' | 'judge' | 'decide' | 'settle' | 'feedback'

export interface Station {
  id: StationId
  /** `01`–`06`, as the design numbers them. */
  n: string
  label: string
  /** The count, or null when nothing can be counted yet. */
  value: number | null
  /** One line under the number — the unit, or what is missing. */
  detail: string
  /** Where the chip goes, with this objective already in scope. */
  to: string
  /**
   * Settle and Feed back leave the research loop: one meets the account, the
   * other rewrites the policy the machine runs on.
   */
  crossesOuterLoop?: boolean
}

/** A candidate row's objective, when the harness stamped one. */
export function candidateObjectiveId(row: Pick<ResearchCandidate, 'source_ref'>): string | null {
  const ref = row.source_ref
  if (!ref || typeof ref !== 'object') return null
  const id = (ref as Record<string, unknown>).objective_id
  return typeof id === 'string' && id ? id : null
}

/** A hypothesis's birth run, when it was born in one. */
export function hypothesisRunId(h: Pick<Hypothesis, 'origin_ref'>): string | null {
  const ref = h.origin_ref
  if (!ref || typeof ref !== 'object') return null
  const id = (ref as Record<string, unknown>).run_id
  return typeof id === 'string' && id ? id : null
}

/** A draft's objective, as the payload carries it. */
export function draftObjectiveId(d: Pick<AiDraft, 'payload'>): string | null {
  const id = d.payload?.objective_id
  return typeof id === 'string' && id ? id : null
}

export interface LapInput {
  objectiveId: string
  brief: AutopilotObjective | null
  candidates: readonly ResearchCandidate[]
  /** Every run this objective has, so a hypothesis can be traced back to it. */
  runIds: ReadonlySet<string>
  hypotheses: readonly Hypothesis[]
  /** Pending drafts, any kind — the station picks the policy ones itself. */
  drafts: readonly AiDraft[]
}

export function objectiveLap(input: LapInput): Station[] {
  const { objectiveId, brief, candidates, runIds, hypotheses, drafts } = input
  const rec = brief?.track_record ?? null

  const nominated = candidates.filter(
    (c) => c.status === 'open' && candidateObjectiveId(c) === objectiveId,
  ).length
  const decided = hypotheses.filter((h) => {
    const run = hypothesisRunId(h)
    return run != null && runIds.has(run)
  }).length
  const fedBack = drafts.filter(
    (d) => d.kind === 'policy_suggestion' && draftObjectiveId(d) === objectiveId,
  ).length

  const considered = brief?.last_memo?.considered ?? null
  const judged = rec?.judged ?? null

  return [
    {
      id: 'scan',
      n: '01',
      label: 'Scan',
      value: considered,
      // Per run, not cumulative: the policy's reach is what it opened the last
      // time it ran, and summing runs would count the same names daily.
      detail: considered == null ? 'no run yet' : 'names its policy opened, last run',
      to: '/research/scan',
    },
    {
      id: 'nominate',
      n: '02',
      label: 'Nominate',
      value: nominated,
      detail: nominated === 0 ? 'nothing of its own in the pool' : 'open in the pool',
      to: '/research/loop/candidates',
    },
    {
      id: 'judge',
      n: '03',
      label: 'Judge',
      value: brief?.pending_memos ?? null,
      detail: brief == null ? 'no standing' : 'memos waiting on your call',
      to: '/research/loop/decisions',
    },
    {
      id: 'decide',
      n: '04',
      label: 'Decide',
      value: decided,
      detail: decided === 0 ? 'no hypothesis born in its runs' : 'hypotheses born in its runs',
      to: '/research/loop/hypotheses',
    },
    {
      id: 'settle',
      n: '05',
      label: 'Settle',
      value: judged,
      detail:
        rec == null || judged == null
          ? 'nothing settled'
          : `settled · hit ${fmtPct0(rec.hit_rate)}${rec.pending ? ` · ${rec.pending} open` : ''}`,
      to: '/research/signal-decay',
      crossesOuterLoop: true,
    },
    {
      id: 'feedback',
      n: '06',
      label: 'Feed back',
      value: fedBack,
      detail: fedBack === 0 ? 'no patch waiting' : 'policy patches to approve',
      to: '/research/loop/decisions',
      crossesOuterLoop: true,
    },
  ]
}

/**
 * How a scope lands on a list whose rows carry an objective directly.
 *
 * The Candidate Pool's rows do: `source_ref.objective_id` is written by the
 * run that proposed them, and on DEV 55 of 62 carry one. That is the case the
 * design assumes and the case where the scope really should **filter** — the
 * rows it hides are rows another machine proposed, or rows nobody's machine
 * did, and both are the answer to "what did THIS one produce".
 *
 * Contrast the Hypothesis Board, where the same question has to be answered
 * with the filter off because the link does not resolve. One shared shape,
 * two honest outcomes: the count is what tells them apart.
 */
export interface ScopeSplit<T> {
  /** Rows this objective proposed. */
  kept: T[]
  /** Rows another objective proposed. */
  otherObjective: number
  /** Rows no objective proposed — hand, scan, copilot. */
  noObjective: number
  total: number
}

export function splitByObjective<T extends Pick<ResearchCandidate, 'source_ref'>>(
  rows: readonly T[],
  objectiveId: string,
): ScopeSplit<T> {
  const kept: T[] = []
  let otherObjective = 0
  let noObjective = 0
  for (const r of rows) {
    const id = candidateObjectiveId(r)
    if (id == null) noObjective += 1
    else if (id === objectiveId) kept.push(r)
    else otherObjective += 1
  }
  return { kept, otherObjective, noObjective, total: rows.length }
}
