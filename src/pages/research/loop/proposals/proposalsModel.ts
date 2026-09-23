/**
 * What the habits argue for, as diffs against rules.
 *
 * The design's rule for this page is that advice which is not a diff is not
 * actionable, so a proposal is generated rather than written: a habit that has
 * cost something repeatedly, its sample, its cost, and the trades that make the
 * case. Four of them, each pointed at a different rule.
 *
 * A proposal here can be in one of four states, and the difference matters:
 *
 * - **argued** — the habit is measured, it has a sample, and it has a cost in
 *   dollars. Since 2026-09-18 one proposal reaches this: the give-back on
 *   winners, read off the contract's own daily bars.
 * - **no cost** — the habit is measured but its cost is not, because a cost is
 *   what the behaviour did against what the plan would have produced.
 * - **no habit** — the tendency itself cannot be measured on this side.
 * - **measuring** — the bars have not come back yet. Kept apart from "no habit"
 *   because for the ~40 seconds the marks are in flight this page used to make
 *   the strongest negative claim it has, about a habit it was in the middle of
 *   measuring: the give-back reads `argued` once the bars land.
 *
 * Every proposal's *diff* is marked regardless of state, and that is not a
 * formality: a diff needs the rule's current text to subtract from, and no
 * rules store exists here. A proposal with an invented "before" line would be
 * arguing against a rule nobody wrote.
 */
import { fmtUsd } from '@/utils/positions'
import type { HabitReading } from '@/utils/reviewHabits'
import type { ReviewTrade } from '@/utils/reviewTrades'

export type ProposalState = 'argued' | 'no-cost' | 'no-habit' | 'measuring'

export interface ProposalCite {
  /** The trade's §14.4 contract token. */
  label: string
  contractKey: string
  /** What this trade contributes to the argument. */
  amount: number
}

export interface Proposal {
  key: string
  title: string
  /** The rule it would change. */
  target: string
  state: ProposalState
  /** The habit's sample, or null when the habit itself is unmeasured. */
  n: number | null
  /** The dollars at stake, when the habit carries a cost. */
  effect: number | null
  evidence: string
  /** The trades that make the case, worst first. Empty when there is no habit. */
  cites: ProposalCite[]
  /** What the rule would have to say instead — the design's `+` line. */
  after: string
  /** Why the `−` line cannot be written. Always present: there is no rules store. */
  beforeMissing: string
  /** What this proposal is still waiting on, when it is not fully argued. */
  blockedBy: string | null
}

const NO_RULE_TEXT =
  'the rule’s current text — a diff subtracts from it, and no rules store exists on this side'

const MAX_CITES = 6

function habit(habits: readonly HabitReading[], key: string): HabitReading | undefined {
  return habits.find((h) => h.key === key)
}

/** The trades that contribute most to a habit's cost, worst first. */
function citesFor(h: HabitReading | undefined, trades: readonly ReviewTrade[], amount: (dot: { key: string; value: number }) => number): ProposalCite[] {
  if (h == null || h.dots.length === 0) return []
  const byKey = new Map(trades.map((t) => [t.contractKey, t]))
  return h.dots
    .map((d) => ({ contractKey: d.key, label: byKey.get(d.key)?.label ?? d.key, amount: amount(d) }))
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, MAX_CITES)
}

export function buildProposals(
  habits: readonly HabitReading[],
  trades: readonly ReviewTrade[],
  paths: Map<string, { best: number }>,
): Proposal[] {
  const disposition = habit(habits, 'disposition')
  const cut = habit(habits, 'cut_latency')
  const ivr = habit(habits, 'ivr_entry')
  const capture = habit(habits, 'capture')

  const byKey = new Map(trades.map((t) => [t.contractKey, t]))

  return [
    {
      key: 'hard_exit',
      title: 'Make the profit target a hard exit',
      target: 'Playbook · all short-premium plays',
      state: disposition?.measuring
        ? 'measuring'
        : disposition?.consequence == null
          ? 'no-habit'
          : 'argued',
      n: disposition?.value == null ? null : disposition.n,
      effect: disposition?.consequence ?? null,
      evidence: disposition?.measuring
        ? 'Reading each winning contract’s own daily marks to find the peak it printed. Whether this is argued is not known yet.'
        : disposition?.value == null
          ? 'The give-back on winners is what would argue for this, and it needs each contract’s daily marks to know what the peak was.'
          : `${disposition.read} Across them, ${fmtUsd(Math.abs(disposition.consequence ?? 0), true)} of what the positions had already printed was not taken. A resting order at the target takes it without a decision being made in the moment.`,
      cites: citesFor(disposition, trades, (d) => {
        const best = paths.get(d.key)?.best
        const realised = byKey.get(d.key)?.realised
        return best == null || realised == null ? 0 : Math.max(0, best - realised)
      }),
      after: 'exit: resting GTC close at the target, no discretion inside the window',
      beforeMissing: NO_RULE_TEXT,
      blockedBy:
        disposition?.measuring || disposition?.consequence != null ? null : 'the mark path on winning trades',
    },
    {
      key: 'stop_latency',
      title: 'Add a time stop after a new worst mark',
      target: 'Playbook · all short-premium plays',
      state: cut?.measuring ? 'measuring' : cut?.value == null ? 'no-habit' : 'no-cost',
      n: cut?.value == null ? null : cut.n,
      effect: null,
      evidence: cut?.measuring
        ? 'Reading each losing contract’s own daily marks to find the worst it printed.'
        : cut?.value == null
          ? 'How long a loser stays open past its worst mark is the reading, and it needs the mark path.'
          : `${cut.read} A time stop does not have to predict the bottom, only to stop the drift. What it would have saved is the part that is missing: that is this exit against the one the plan would have taken, and no plan is linked to a position.`,
      cites: citesFor(cut, trades, (d) => d.value),
      after: 'stop: force a review three sessions after any new worst mark',
      beforeMissing: NO_RULE_TEXT,
      blockedBy: cut?.measuring ? null : 'a cost — the planned exit to measure the delay against',
    },
    {
      key: 'ivr_floor',
      title: 'Enforce the IV-rank floor at entry',
      target: 'Playbook · IV-rich entries',
      state: 'no-habit',
      n: null,
      effect: null,
      evidence:
        ivr?.read ??
        'Where in its own year’s volatility each trade was opened, against the floor the rule states.',
      cites: [],
      after: 'entry: below the floor blocks the order; an override needs a written reason on the plan',
      beforeMissing: NO_RULE_TEXT,
      blockedBy: 'the underlying’s IV rank on each entry date, and the floor itself',
    },
    {
      key: 'retarget',
      title: 'Move the target to where the trades actually print',
      target: 'Playbook · the plays whose plans under-aim',
      state: 'no-habit',
      n: null,
      effect: null,
      evidence:
        capture?.read ??
        'What the plan aimed at, as a share of the best mark the trade printed. This one is a plan fix, not a discipline fix — it needs a backtest before it is accepted, not more willpower.',
      cites: [],
      after: 'target: raised, pending a backtest re-run over the same window',
      beforeMissing: NO_RULE_TEXT,
      blockedBy: 'the planned exit — the best mark it would be divided by is already read',
    },
  ]
}

/** The chain the design draws, with the state of each link. */
export function proposalChain(habits: readonly HabitReading[], proposals: readonly Proposal[]) {
  const measured = habits.filter((h) => h.value != null).length
  const costed = habits.filter((h) => h.consequence != null).length
  const argued = proposals.filter((p) => p.state === 'argued').length
  // A count taken mid-flight is a claim about a book still being read. The
  // links keep their shape and withhold the number instead of printing a
  // smaller one that will change on its own.
  const measuring = habits.some((h) => h.measuring)

  return [
    {
      key: 'habit',
      step: 'A habit',
      what: 'a behaviour repeated across enough trades to be a pattern rather than an anecdote',
      state: measured > 0 ? ('partial' as const) : ('missing' as const),
      note: measuring
        ? `${measured} of ${habits.length} are measured so far; the ones read off the daily marks are still arriving.`
        : `${measured} of ${habits.length} are measured; the rest need a plan linked to a position.`,
      to: '/review/habits',
    },
    {
      key: 'cost',
      step: 'Its cost',
      what: 'what the behaviour did to P&L — the dollars that make it worth changing a rule over',
      state: costed > 0 ? ('partial' as const) : ('missing' as const),
      note: measuring
        ? 'Reading the contracts’ own daily marks — which habits carry a cost is not known yet.'
        : costed > 0
          ? `${costed} carries one, read off the contract’s own daily marks. The others are the plan’s subtraction, and no plan is linked to a position.`
          : 'No habit carries a cost: the subtraction that turns a tendency into one needs the plan.',
      to: '/trade/plans',
    },
    {
      key: 'proposal',
      step: 'A proposal',
      what: 'a diff against a specific rule, carrying the habit, its cost and the trades that argued it',
      state: 'missing' as const,
      note: measuring
        ? 'How many have evidence above the floor is still being read; none can be written as a diff regardless — a diff needs the rule’s current text, and no rules store exists here.'
        : `${argued} of ${proposals.length} has evidence above the floor, and none can be written as a diff — a diff needs the rule’s current text, and no rules store exists here.`,
      to: '/trade/plans',
    },
    {
      key: 'decision',
      step: 'Accepted or refused',
      what: 'a dated decision, so the rule’s history says why it reads the way it does',
      state: 'missing' as const,
      note: 'Nothing stores a decision, so accept, defer and reject are drawn and disabled rather than hidden.',
      to: '/risk/limits',
    },
    {
      key: 'outcome',
      step: 'Measured after',
      what: 'the trades that followed the change, against the ones before it',
      state: 'missing' as const,
      note: 'Needs the decision to be dated, so there is a before and an after to split on.',
      to: '/review/playbook-stats',
    },
  ]
}
