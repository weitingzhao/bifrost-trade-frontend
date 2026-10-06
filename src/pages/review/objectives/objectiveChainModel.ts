/**
 * Did the machine earn its keep — the chain, per objective.
 *
 * Design `Review Objectives.dc.html`: Research builds machines, and only
 * settled money says whether one was worth running. The page reads
 * **proposed → accepted → traded → settled** for each of them, and it is the
 * one place the loop closes: a verdict here is what sends a patch back.
 *
 * **The link at `traded`** is `hypothesis.linked_trade_ids` (research
 * 0.193.0, TD-143): Research derives it at read time from this Trade
 * environment's filled plans written from a hypothesis (`source_kind =
 * 'hypothesis'`, `source_ref` = the hypothesis id, `trade_id` set). Nothing
 * is stored for it. The chain runs objective → candidate (`source_ref.
 * objective_id`) → hypothesis (`candidate.hypothesis_id`) → trade ids → the
 * closed contracts booked to those trades.
 *
 * Until 0.193.0 nothing linked a belief to a position (`linked_opportunity_ids`
 * empty on all 91 hypotheses, 2026-10-06), and the page broke the chain
 * honestly at `traded`. It still does whenever the link cannot be read — an
 * older Research, a failed Trade read, or an environment this page cannot
 * name — and then the columns after `accepted` read `—`, not zero. Once it is
 * read, a zero is a reading: no filled plan was written from that objective's
 * hypotheses. Settled contracts no plan links land in Unattributed.
 */
import { RECORD_BY_SOURCE_PATH } from '@/utils/tradeOrigin'
import type { ResearchObjective } from '@/api/research/harness'
import type { ResearchCandidate } from '@/api/research/candidates'
import type { Hypothesis, TradeEnv, TradeLinkBasis } from '@/api/researchHypothesis'
import type { ReviewContract } from '@/utils/reviewContracts'
import { candidateObjectiveId } from '@/lib/objectiveScope'

/**
 * Settled trades an objective needs before a hit rate is a claim.
 *
 * The design's own default. Below it the page says so rather than printing a
 * percentage that reads like an answer: an objective with three settled
 * contracts has a record of three settled contracts, not a hit rate.
 */
export const VERDICT_FLOOR = 5

export type Verdict = 'EARNING' | 'DID NOT EARN' | 'BELOW FLOOR' | 'NO VERDICT' | 'NOT A MACHINE'

/** The one field whose absence breaks the chain. Named, not described. */
export const BROKEN_LINK = 'hypothesis.linked_trade_ids'

/** Where the link comes from, in the stores' own words. */
export const LINK_SOURCE = "Trade plans · source_kind 'hypothesis' → trade_id"

/** Whether the link can be read on this page — and when not, why. */
export type LinkState = { read: true; env: TradeEnv; truncated: boolean } | { read: false; why: string }

export function linkStateOf(basis: TradeLinkBasis | null | undefined, env: TradeEnv | null): LinkState {
  if (!basis) {
    return { read: false, why: `\`${BROKEN_LINK}\` is not served — Research before 0.193.0 does not derive it.` }
  }
  if (env == null) {
    return {
      read: false,
      why: `This page could not tell which Trade environment it reads (account /health config_profile), so \`${BROKEN_LINK}\` cannot be matched to its trades.`,
    }
  }
  if (basis.error) return { read: false, why: `\`${BROKEN_LINK}\` is unread — Trade's plans did not answer: ${basis.error}` }
  if (basis.trade_env !== env) {
    return { read: false, why: `\`${BROKEN_LINK}\` was read from ${basis.trade_env} plans; this page reads ${env} trades.` }
  }
  return { read: true, env, truncated: basis.truncated }
}

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

function verdictOf(
  settled: number | null,
  hit: number | null,
  net: number | null,
  floor: number,
  unread = '',
): {
  verdict: Verdict
  why: string
} {
  if (settled == null) {
    return {
      verdict: 'NO VERDICT',
      why: `Nothing links this objective to a settled position. ${unread} The contracts it may have produced cannot be found. Not a bad machine, an unmeasurable one.`,
    }
  }
  if (settled < floor) {
    return {
      verdict: 'NO VERDICT',
      why: `${settled} settled · ${floor} needed. Not a bad machine — an unmeasured one.`,
    }
  }
  if (net != null && net > 0 && hit != null && hit >= 0.45) {
    return { verdict: 'EARNING', why: 'Clears its floor and is net positive on settled contracts.' }
  }
  if (net != null && net <= 0) {
    return {
      verdict: 'DID NOT EARN',
      why: `Net negative on ${settled} settled contracts. Whether the signal or the vehicle is at fault is the next question, not this column.`,
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
  trades: readonly ReviewContract[]
  /** The hypothesis list's `trade_link_basis` (research 0.193.0); absent before. */
  linkBasis?: TradeLinkBasis | null
  /** The Trade environment this page reads trades from. */
  tradeEnv?: TradeEnv | null
  floor?: number
}

/**
 * Whether the link can be read at all. The whole page turns on this one
 * reading: while it is false, `traded` and everything after it is unknowable
 * per objective, and the page must say why rather than showing zeroes that
 * look like an answer.
 */
export function lineageIsWired(basis: TradeLinkBasis | null | undefined, env: TradeEnv | null): boolean {
  return linkStateOf(basis, env).read
}

export function objectiveChain(input: ChainInput): {
  rows: ChainRow[]
  unattributed: ChainRow
  wired: boolean
  link: LinkState
} {
  const { objectives, candidates, hypotheses, trades } = input
  const floor = input.floor ?? VERDICT_FLOOR
  const link = linkStateOf(input.linkBasis, input.tradeEnv ?? null)
  const wired = link.read
  const unread = link.read ? '' : link.why
  const closed = trades.filter((t) => t.closedOn != null)
  const tradesOf = new Map(hypotheses.map((h) => [h.id, h.linked_trade_ids ?? []]))
  const linked = new Set(hypotheses.flatMap((h) => h.linked_trade_ids ?? []))

  const rows: ChainRow[] = objectives.map((o) => {
    const mine = candidates.filter((c) => candidateObjectiveId(c) === o.id)
    const proposed = mine.length
    const accepted = mine.filter((c) => c.status === 'promoted').length
    // Everything past `accepted` needs the link. Null, never zero, while it is
    // unread: a zero would read as "it traded nothing", and what is true is
    // "we cannot tell".
    const ids = new Set(
      mine.flatMap((c) => (c.hypothesis_id ? (tradesOf.get(c.hypothesis_id) ?? []) : [])),
    )
    const settledRows = wired ? closed.filter((t) => t.tradeId != null && ids.has(t.tradeId)) : []
    const settled = wired ? settledRows.length : null
    const hit = settled ? settledRows.filter((t) => t.win).length / settled : null
    const net = settled ? settledRows.reduce((a, t) => a + t.realised, 0) : null
    const v = verdictOf(settled, hit, net, floor, unread)
    return {
      id: o.id,
      title: o.title ?? o.id,
      state: o.status ?? '—',
      mode: o.mode ?? null,
      hitFloor: null,
      proposed,
      accepted,
      traded: wired ? ids.size : null,
      settled,
      hit,
      net,
      verdict: v.verdict,
      why: v.why,
      to: `/research/loop/objectives/${o.id}`,
    }
  })

  // Every closed trade no linked plan reaches — the whole book while the link
  // is unread. The design requires this row so the rates above it stay honest.
  const rest = wired ? closed.filter((t) => t.tradeId == null || !linked.has(t.tradeId)) : closed
  const unattributed: ChainRow = {
    id: 'unattributed',
    title: 'Unattributed',
    state: '—',
    mode: null,
    hitFloor: null,
    proposed: null,
    accepted: null,
    traded: null,
    settled: rest.length,
    hit: rest.length > 0 ? rest.filter((t) => t.win).length / rest.length : null,
    net: rest.reduce((a, t) => a + t.realised, 0),
    verdict: 'NOT A MACHINE',
    why: wired
      ? 'Opened without a plan written from a hypothesis, or from one no objective proposed. Real money, and not evidence about any objective.'
      : `Every settled contract is here: ${unread} Nothing on this side ties a position back to the objective that proposed it. Real money, and not yet evidence about any machine.`,
    // Settled money read by where the idea came from is the question this row
    // raises — Outcome's cut, Playbook › Record · By source since Rev .112.
    to: RECORD_BY_SOURCE_PATH,
  }

  return { rows, unattributed, wired, link }
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
export function chainWindow(trades: readonly ReviewContract[]): string {
  const days = trades.map((t) => t.closedOn).filter(Boolean).sort()
  if (days.length === 0) return 'settled contracts · nothing closed yet · all accounts'
  const first = days[0]
  const last = days[days.length - 1]
  return first === last
    ? `settled contracts · ${first} · all accounts`
    : `settled contracts · ${first} → ${last} · all accounts`
}
