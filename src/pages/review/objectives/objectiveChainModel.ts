/**
 * Did the machine earn its keep — the chain, per objective.
 *
 * Design `Review Objectives.dc.html`: Research builds machines, and only
 * settled money says whether one was worth running. The page reads
 * **proposed → accepted → traded → settled** for each of them, and it is the
 * one place the loop closes: a verdict here is what sends a patch back.
 *
 * **On this side the chain breaks at `traded`, and this file's job is to
 * break it honestly.** Measured on DEV 2026-09-20:
 *
 *   /research/objectives       1
 *   /research/objective-runs  29
 *   /research/candidates      62  (10 carry a hypothesis_id)
 *   /research/hypothesis      29  — and **0** carry a linked_opportunity_id
 *   settled side              25 distinct strategy_opportunity_id
 *   intersection               0
 *
 * So nothing links a belief to a position, and no settled trade can be
 * attributed to the objective that proposed it. The columns that need the
 * link read `—` with the field named, and every settled trade lands in the
 * Unattributed row — which the design makes a hard requirement for exactly
 * this reason: *"a chain with a missing link is a fact about the record, not
 * a rounding error"*, and hiding it would make every rate above it wrong.
 *
 * The request for the missing write is R5 in
 * `REQUEST-research-data-2026-09-20.md`.
 */
import type { ResearchObjective } from '@/api/research/harness'
import type { ResearchCandidate } from '@/api/research/candidates'
import type { Hypothesis } from '@/api/researchHypothesis'
import type { ReviewTrade } from '@/utils/reviewTrades'
import { candidateObjectiveId } from '@/pages/research/loop/objectiveLapModel'

/**
 * Settled trades an objective needs before a hit rate is a claim.
 *
 * The design's own default. Below it the page says so rather than printing a
 * percentage that reads like an answer: an objective with three settled
 * trades has a record of three settled trades, not a hit rate.
 */
export const VERDICT_FLOOR = 5

export type Verdict = 'EARNING' | 'DID NOT EARN' | 'BELOW FLOOR' | 'NO VERDICT' | 'NOT A MACHINE'

/** The one field whose absence breaks the chain. Named, not described. */
export const BROKEN_LINK = 'hypothesis.linked_opportunity_ids'

export interface ChainRow {
  id: string
  title: string
  state: string
  /** Who works it — the tag the top-bar Objective control wears (Rev .55); null for Unattributed. */
  mode: 'hand' | 'assisted' | 'auto' | null
  /**
   * The hit rate this objective set itself, when it set one.
   *
   * The design carries one per objective and prints it under the Hit column.
   * Nothing on this side stores it — `VERDICT_FLOOR` is a *count* of settled
   * trades, which is a different claim — so the cell says so rather than
   * borrowing the count and printing it as a percentage.
   */
  hitFloor: number | null
  /** Counts, or null where the link is missing. */
  proposed: number | null
  accepted: number | null
  traded: number | null
  settled: number | null
  hit: number | null
  net: number | null
  verdict: Verdict
  /** Why that verdict, in the words the reader would use. */
  why: string
  to: string | null
}

function verdictOf(settled: number | null, hit: number | null, net: number | null, floor: number): {
  verdict: Verdict
  why: string
} {
  if (settled == null) {
    return {
      verdict: 'NO VERDICT',
      why: `Nothing links this objective to a settled position — \`${BROKEN_LINK}\` is empty on every hypothesis, so the trades it may have produced cannot be found. Not a bad machine, an unmeasurable one.`,
    }
  }
  if (settled < floor) {
    return {
      verdict: 'NO VERDICT',
      why: `${settled} settled · ${floor} needed. Not a bad machine — an unmeasured one.`,
    }
  }
  if (net != null && net > 0 && hit != null && hit >= 0.45) {
    return { verdict: 'EARNING', why: 'Clears its floor and is net positive on settled trades.' }
  }
  if (net != null && net <= 0) {
    return {
      verdict: 'DID NOT EARN',
      why: `Net negative on ${settled} settled trades. Whether the signal or the vehicle is at fault is the next question, not this column.`,
    }
  }
  return {
    verdict: 'BELOW FLOOR',
    why: 'Net positive but under the floor it set itself — it is earning less than it claims to.',
  }
}

export interface ChainInput {
  objectives: readonly ResearchObjective[]
  candidates: readonly ResearchCandidate[]
  hypotheses: readonly Hypothesis[]
  /** Closed trades, from the same builder the Review queue reads. */
  trades: readonly ReviewTrade[]
  floor?: number
}

/**
 * Whether any hypothesis carries a settled position.
 *
 * The whole page turns on this one reading, so it is computed once and named:
 * while it is false, `traded` and everything after it is unknowable per
 * objective, and the page must say which field would make it knowable rather
 * than showing zeroes that look like an answer.
 */
export function lineageIsWired(hypotheses: readonly Hypothesis[]): boolean {
  return hypotheses.some((h) => (h.linked_opportunity_ids ?? []).length > 0)
}

export function objectiveChain(input: ChainInput): {
  rows: ChainRow[]
  unattributed: ChainRow
  wired: boolean
} {
  const { objectives, candidates, hypotheses, trades } = input
  const floor = input.floor ?? VERDICT_FLOOR
  const wired = lineageIsWired(hypotheses)

  const rows: ChainRow[] = objectives.map((o) => {
    const mine = candidates.filter((c) => candidateObjectiveId(c) === o.id)
    const proposed = mine.length
    const accepted = mine.filter((c) => c.status === 'promoted').length
    // Everything past `accepted` needs the link. Null, never zero: a zero here
    // would read as "it traded nothing", and what is true is "we cannot tell".
    const settled = wired ? 0 : null
    const v = verdictOf(settled, null, null, floor)
    return {
      id: o.id,
      title: o.title ?? o.id,
      state: o.status ?? '—',
      mode: o.mode ?? null,
      hitFloor: null,
      proposed,
      accepted,
      traded: wired ? 0 : null,
      settled,
      hit: null,
      net: null,
      verdict: v.verdict,
      why: v.why,
      to: `/research/loop/objectives/${o.id}`,
    }
  })

  // Every closed trade, because none of them can be attributed. The design
  // requires this row so the rates above it stay honest; here it holds the
  // whole book rather than the remainder.
  const closed = trades.filter((t) => t.closedOn != null)
  const unattributed: ChainRow = {
    id: 'unattributed',
    title: 'Unattributed',
    state: '—',
    mode: null,
    hitFloor: null,
    proposed: null,
    accepted: null,
    traded: null,
    settled: closed.length,
    hit: closed.length > 0 ? closed.filter((t) => t.win).length / closed.length : null,
    net: closed.reduce((a, t) => a + t.realised, 0),
    verdict: 'NOT A MACHINE',
    why: wired
      ? 'Hand-opened, or a plan edited past the point where its lineage could be traced back to a run. Real money, and not evidence about any objective.'
      : `Every settled trade is here, because \`${BROKEN_LINK}\` is empty on every hypothesis — nothing on this side ties a position back to the objective that proposed it. Real money, and not yet evidence about any machine.`,
    // Outcome is where settled money is read by where the idea came from,
    // which is the question this row raises. The design sends it there too.
    to: '/portfolio/outcome',
  }

  return { rows, unattributed, wired }
}

/**
 * The widest gate this side can actually see, per objective.
 *
 * The design's "Where they die" reads the loop's own funnel stages. This side
 * records two of them — proposed and accepted — so it reports that drop and
 * says the rest is not recorded per objective, instead of naming a stage it
 * cannot measure.
 */
export function widestGate(row: ChainRow): { label: string; share: number | null; note: string } {
  if (row.proposed == null || row.proposed === 0) {
    return {
      label: 'never ran',
      share: null,
      note: 'Nothing was proposed under this objective, so there is no gate to measure yet.',
    }
  }
  const held = row.proposed - (row.accepted ?? 0)
  return {
    label: 'held at approval',
    share: held / row.proposed,
    note: `${held} of ${row.proposed} nominations were never promoted. It is the only gate this side records per objective — the loop's earlier stages (universe, screen, judge) are counted per run, not per objective, so a narrower gate could be hiding inside them.`,
  }
}

/**
 * The row's own next move — the design's last column.
 *
 * The design offers `Draft patch →` where settled evidence argues for a
 * change. Nothing on this side can: a patch has to carry the evidence that
 * argued for it, and no settled trade can be attributed. So the column stays
 * and says which of the four situations the row is in, rather than printing
 * `Nothing to change` over a row nobody could judge — those are opposite
 * claims, and the design's own wording only fits the first.
 */
export function chainAction(row: ChainRow): { label: string; to: string | null; why: string } {
  if (row.verdict === 'NOT A MACHINE') {
    return {
      label: 'Why →',
      to: row.to,
      why: 'Real money with no machine behind it. Read by where the idea came from on Outcome.',
    }
  }
  if (row.verdict === 'NO VERDICT') {
    return {
      label: 'No evidence yet',
      to: null,
      why: `${row.why} A patch has to carry the settled evidence that argued for it, so there is nothing to draft from this row.`,
    }
  }
  if (row.verdict === 'DID NOT EARN') {
    return {
      label: 'Draft patch →',
      to: null,
      why: 'A losing record is what argues for a change — but drafting one needs a patch store, and there is none on this side yet.',
    }
  }
  return {
    label: 'Nothing to change',
    to: null,
    why: 'It clears its floor and the gate that removes the most is doing its job.',
  }
}

/**
 * What the window at the top of the page is true of.
 *
 * The design writes `trailing 90d`. This side reads every canonical execution
 * with no window at all, so the string is derived from the trades themselves —
 * printing the design's 90 days over an all-time read would be a caption that
 * lies about its own figures.
 */
export function chainWindow(trades: readonly ReviewTrade[]): string {
  const days = trades.map((t) => t.closedOn).filter(Boolean).sort()
  if (days.length === 0) return 'settled trades · nothing closed yet · all accounts'
  const first = days[0]
  const last = days[days.length - 1]
  return first === last
    ? `settled trades · ${first} · all accounts`
    : `settled trades · ${first} → ${last} · all accounts`
}
