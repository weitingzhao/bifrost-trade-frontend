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
 * Rev .102 closes the strip at both ends with The Book's arcs (Vision §22.2):
 * Borrowed — the belief the objective runs on — before 01, and Learned — what
 * the nightly distill took from its walk, and what it proposed — after 06. The
 * ".7" marks on Settle and Feed back ("crosses the outer loop") are withdrawn:
 * §22.3 gives "outer loop" another meaning.
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
import type { MemoryOrigin } from '@/lib/harness/objectiveOrigin'
import type { AutopilotObjective, ObjectiveRun } from '@/api/research/harness'
import type { ResearchCandidate } from '@/api/research/candidates'
import type { Hypothesis } from '@/api/researchHypothesis'
import type { AiDraft } from '@/api/researchDrafts'
import { fmtPct0 } from '@/utils/positions'
import { candidateObjectiveId } from '@/lib/objectiveScope'

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
  /**
   * The standing could not be read (a 401 without a Research user): Scan,
   * Judge and Settle read «—» rather than "no run yet" / "no standing".
   */
  briefUnread?: boolean
  /** Null when the pool could not be read — Nominate reads «—», not 0. */
  candidates: readonly ResearchCandidate[] | null
  /** Every run this objective has, so a hypothesis can be traced back to it. Null when unread. */
  runIds: ReadonlySet<string> | null
  /** Null when the hypotheses could not be read. */
  hypotheses: readonly Hypothesis[] | null
  /**
   * Pending drafts, any kind — the station picks the policy ones itself. Null
   * when they could not be read (a 401 without a Research user): the station
   * reads «—», not "no patch waiting".
   */
  drafts: readonly AiDraft[] | null
}

/** What a station says when the read it counts was refused. */
export const LAP_UNREAD = 'not read — Research user not set'

export function objectiveLap(input: LapInput): Station[] {
  const { objectiveId, brief, briefUnread = false, candidates, runIds, hypotheses, drafts } = input
  const rec = brief?.track_record ?? null

  const nominated =
    candidates == null
      ? null
      : candidates.filter((c) => c.status === 'open' && candidateObjectiveId(c) === objectiveId).length
  const decided =
    hypotheses == null || runIds == null
      ? null
      : hypotheses.filter((h) => {
          const run = hypothesisRunId(h)
          return run != null && runIds.has(run)
        }).length
  const fedBack =
    drafts == null
      ? null
      : drafts.filter((d) => d.kind === 'policy_suggestion' && draftObjectiveId(d) === objectiveId).length

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
      detail: briefUnread ? LAP_UNREAD : considered == null ? 'no run yet' : 'names its policy opened, last run',
      to: '/research/scan',
    },
    {
      id: 'nominate',
      n: '02',
      label: 'Nominate',
      value: nominated,
      detail: nominated == null ? LAP_UNREAD : nominated === 0 ? 'nothing of its own in the pool' : 'open in the pool',
      to: '/research/loop/candidates',
    },
    {
      id: 'judge',
      n: '03',
      label: 'Judge',
      value: brief?.pending_memos ?? null,
      detail: briefUnread ? LAP_UNREAD : brief == null ? 'no standing' : 'memos waiting on your call',
      to: '/research/loop/decisions',
    },
    {
      id: 'decide',
      n: '04',
      label: 'Decide',
      value: decided,
      detail: decided == null ? LAP_UNREAD : decided === 0 ? 'no hypothesis born in its runs' : 'hypotheses born in its runs',
      to: '/research/loop/hypotheses',
    },
    {
      id: 'settle',
      n: '05',
      label: 'Settle',
      value: judged,
      detail: briefUnread
        ? LAP_UNREAD
        : rec == null || judged == null
          ? 'nothing settled'
          : `settled · hit ${fmtPct0(rec.hit_rate)}${rec.pending ? ` · ${rec.pending} open` : ''}`,
      to: '/research/signal-decay',
    },
    {
      id: 'feedback',
      n: '06',
      label: 'Feed back',
      value: fedBack,
      detail: fedBack == null ? 'drafts not read' : fedBack === 0 ? 'no patch waiting' : 'policy patches to approve',
      to: '/research/loop/decisions',
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

/**
 * The tags a candidate row carries that its other columns do not already say.
 *
 * Measured on DEV 2026-09-21: 58 of the 64 candidates carrying tags carry
 * *only* `harness` and `stock_composite` — which are exactly the Source cell
 * and the `data_source` the Why cell prints. Every one of those rows said
 * both twice, and the width it cost pushed Promote and Drop off the right
 * edge of a table that has to scroll.
 *
 * So a tag is dropped when the same row already shows it elsewhere, and the
 * column keeps the six rows whose tags say something — `iv-hot`, `pivot`,
 * `d4-acceptance`. An empty cell here means the tags were all repeats, not
 * that the row was untagged.
 */
export function candidateOwnTags(
  row: Pick<ResearchCandidate, 'tags' | 'source' | 'lens_snapshot'>,
): string[] {
  const ls = (row.lens_snapshot ?? {}) as Record<string, unknown>
  const shownElsewhere = new Set(
    [row.source, typeof ls.data_source === 'string' ? ls.data_source : null]
      .filter((v): v is string => !!v)
      .map((v) => v.toLowerCase()),
  )
  return (row.tags ?? []).filter((t) => !shownElsewhere.has(t.toLowerCase()))
}

export interface LapEnd {
  id: 'borrowed' | 'learned'
  /** `Book ⟶` / `⟶ Book`, as the design heads them. */
  head: string
  label: string
  /** The Book's id when the arc is walked (`H-12`, `M-38`); null = not yet. */
  value: string | null
  detail: string
  /** Why it reads `not yet` — measured, so the reader knows what would light it. */
  why: string
  to: string
}

/**
 * The strip's two ends (Rev .102). Both are edges in the Journal the app does
 * not have yet, measured 2026-09-28 on DEV (research 0.150.0 and the local
 * 0.145.0): an objective records no origin — its `subject` is a ticker, its
 * policy carries no belief id — and memories cite fills and decisions, never
 * an objective's runs. So both ends read `not yet` with that reason, until the
 * distill attributes what it learned. Since batch V3 an objective drafted from
 * a memory proposal records that memory (`policy_json.origin`); the Borrowed
 * end names it and opens its Trace, still unwalked — a memory is not a belief.
 */
export function lapEnds(origin: MemoryOrigin | null = null): [LapEnd, LapEnd] {
  return [
    origin
      ? {
          id: 'borrowed',
          head: 'Book ⟶',
          label: 'Borrowed',
          value: null,
          detail: `born from memory ${origin.memory_id} — no Book belief yet`,
          why: `Drafted from memory ${origin.memory_id} (batch V3), not from a Book belief — the first settle opens one (§22.2). Opens its Trace.`,
          to: `/research/trace?m=${encodeURIComponent(origin.memory_id)}`,
        }
      : {
          id: 'borrowed',
          head: 'Book ⟶',
          label: 'Borrowed',
          value: null,
          detail: 'no Book belief recorded',
          why: 'An objective does not record the belief it was drafted from — only one drafted from a memory proposal records an origin, and that origin is a memory, not a belief.',
          to: '/research/loop/hypotheses',
        },
    {
      id: 'learned',
      head: '⟶ Book',
      label: 'Learned',
      value: null,
      detail: 'nothing distilled from it',
      why: 'Memories cite fills and decisions; none is attributed to an objective’s runs yet, so none can be shown as learned from this one.',
      to: '/research/agent-personas/you',
    },
  ]
}

