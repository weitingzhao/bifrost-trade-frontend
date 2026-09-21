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
import type { AutopilotObjective, ObjectiveRun } from '@/api/research/harness'
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

/**
 * Why this name was nominated — the design's "Thesis sketch".
 *
 * An earlier walk recorded that this column "has no field", which was too
 * strong. There is no prose thesis, but every candidate carries a
 * `lens_snapshot`: the lenses that fired when the run proposed it. Measured
 * on DEV over 62 rows — `path` and `grade` on 51, `stage` on 50,
 * `sepa_score` on 50, `momentum_score` on 49, and an options lens
 * (`iv_rank_1y`, `vrp_pct_252d`, `option_composite`) on a handful.
 *
 * That *is* the sketch, in the vocabulary this side actually has: the
 * objective's own plan says `analyze_symbol` attaches "which layer(s) fired",
 * and this is what it attached. Writing it out beats a blank column, and
 * beats prose nobody wrote.
 *
 * Only the lenses present are printed. A name proposed by a screen rather
 * than a run carries nothing here, and gets an empty sketch rather than a
 * sentence invented for it.
 */
export function candidateSketch(row: Pick<ResearchCandidate, 'lens_snapshot'>): string[] {
  const ls = (row.lens_snapshot ?? {}) as Record<string, unknown>
  const num = (k: string): number | null => {
    const v = ls[k]
    return typeof v === 'number' && Number.isFinite(v) ? v : null
  }
  const str = (k: string): string | null => {
    const v = ls[k]
    return typeof v === 'string' && v ? v : null
  }
  const out: string[] = []
  const stage = str('stage')
  const path = str('path')
  if (path && stage) out.push(`${path} · ${stage.replace(/^STAGE_/, 'stage ')}`)
  else if (path) out.push(path)
  else if (stage) out.push(stage.replace(/^STAGE_/, 'stage '))
  const grade = str('grade')
  if (grade) out.push(`grade ${grade}`)
  const sepa = num('sepa_score')
  if (sepa != null) out.push(`SEPA ${sepa.toFixed(1)}`)
  const mom = num('momentum_score')
  if (mom != null) out.push(`momentum ${mom.toFixed(1)}`)
  const ivr = num('iv_rank_1y') ?? num('iv_rank')
  if (ivr != null) out.push(`IV rank ${Math.round(ivr)}`)
  const vrp = num('vrp_pct_252d')
  if (vrp != null) out.push(`VRP ${vrp.toFixed(1)}`)
  const terrain = str('terrain_regime')
  if (terrain) out.push(terrain)
  return out
}

/**
 * The bar beside a candidate's score, measured against the best in view.
 *
 * The design's Fit is a share of hypothesis conditions satisfied, so its bar
 * runs to 100%. This side's `score` is the loop's composite at ingest and
 * nothing documents its ceiling — observed 0.71 to 85.2 — so a bar drawn to
 * 100 would invent a scale. Measured against the highest score on screen it
 * invents nothing and still answers the question the bar is for: which of
 * these did the loop rank highest.
 */
export function scoreShare(score: number | null, best: number | null): number | null {
  if (score == null || best == null || best <= 0) return null
  return Math.max(0, Math.min(1, score / best))
}

/**
 * The design's "Curator run" cell: when the loop last put something in here,
 * what it put in, and what that cost.
 *
 * The app's strip had "Latest batch" — the newest `trade_date` among the
 * candidates and how many carry it. That is a fact about the rows. The design
 * asks a different question: *when did the machine last act, and what did the
 * act cost.* Those diverge the moment a run proposes nothing, which is
 * exactly when you want to know it ran.
 *
 * Both halves are real here. `/research/objective-runs` carries `started_at`
 * and, in its outputs, the `candidate_ids` that run proposed and the token
 * spend `runSpend` already reads for the console.
 */
export interface CuratorRunReading {
  /** When the newest run started. Null when no run has been recorded. */
  startedAt: string | null
  /** Candidates that run proposed. */
  proposed: number
  /** What the run cost, in dollars. */
  usd: number
  /** Rows in the pool that expiry has screened out. */
  expired: number
}

export function curatorRunReading(
  runs: readonly ObjectiveRun[],
  candidates: readonly Pick<ResearchCandidate, 'status'>[],
  spendOf: (run: ObjectiveRun) => number,
): CuratorRunReading | null {
  const newest = runs.reduce<ObjectiveRun | null>((best, r) => {
    const t = r.started_at ?? ''
    return best == null || t > (best.started_at ?? '') ? r : best
  }, null)
  const expired = candidates.filter((c) => c.status === 'expired').length
  if (newest == null) return null
  const ids = (newest.outputs as { candidate_ids?: unknown } | null)?.candidate_ids
  return {
    startedAt: newest.started_at ?? null,
    proposed: Array.isArray(ids) ? ids.length : 0,
    usd: spendOf(newest),
    expired,
  }
}

/**
 * The run that proposed a candidate — the design's `parent` on the row.
 *
 * The prototype writes it as free text ("memo r-0918-2", "screen s-0918-3").
 * This side has the real thing: `source_ref.run_id`, which is a run with a
 * page of its own. So the parent is a link rather than a caption, and a
 * candidate nobody's run proposed has none rather than a made-up one.
 */
export function candidateRunId(row: Pick<ResearchCandidate, 'source_ref'>): string | null {
  const ref = row.source_ref
  if (!ref || typeof ref !== 'object') return null
  const id = (ref as Record<string, unknown>).run_id
  return typeof id === 'string' && id ? id : null
}
