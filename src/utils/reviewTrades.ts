/**
 * Closed trades, as Review reads them.
 *
 * Review's whole method is to separate two questions a single P&L number
 * blurs: **was the plan any good**, and **did I follow it**. The design draws
 * that as a 2×2 — plan quality against adherence — and every one of its
 * numbers needs two things this side does not have: a written plan linked to
 * the position, and the mark through the holding period.
 *
 * What it does have is the ledger. A closed trade is an option contract the
 * fills have taken flat, and from the fills alone a great deal is knowable:
 * what it made, how long it was held, how far out it was opened, what share of
 * the credit was kept, and which play it belonged to. Those readings are real
 * and are computed here; the two that are not are marked on every page that
 * would use them, never estimated.
 *
 * Grouping is the Ledger's own (`buildOptExecutionGroups`) rather than a second
 * pass over the fills, so a trade here and a row there are the same trade.
 */
import { buildOptExecutionGroups, isOptionExpired, type OptExecutionGroup } from '@/utils/ledger/optExecutionGroups'
import { shortOptContractKey } from '@/utils/ledger/optionsModeBridge'
import { daysTo } from '@/utils/optionTicker'
import type { Execution } from '@/types/positions'

export type ExitKind = 'closed' | 'expired'

export interface ReviewTrade {
  contractKey: string
  /** The §14.4 contract token. */
  label: string
  symbol: string
  accountId: string
  /** The play this trade belonged to, from the fills' own opportunity name. */
  play: string | null
  openedOn: string | null
  closedOn: string | null
  daysHeld: number | null
  /** Days from the open to expiry — how far out it was written. */
  dteAtEntry: number | null
  contracts: number
  realised: number
  win: boolean
  exitKind: ExitKind
  /** True when the trade was opened by selling — a short-premium trade. */
  shortPremium: boolean
  /** Premium taken in, and paid to close. */
  entryPremium: number
  exitPremium: number
  /**
   * `1 − exit ÷ entry` on a short-premium trade: the share of the credit kept.
   *
   * Null on a debit trade, where there is no credit to keep, and on a trade
   * whose entry premium the fills do not carry.
   */
  creditKept: number | null
}

export const REVIEW_UNRECORDED = {
  plan: 'Review’s method needs the plan a trade was opened under — what it was aiming at, and when it said to be out. Trade Plans stores both, but no plan has ever been linked to a position, so for every closed trade here the planned exit is unknown. That makes discipline (realised against the plan’s own exit) and plan cost (the plan’s exit against the best mark) uncomputable, not zero.',
  path: 'The second missing half is the mark through the holding period. Without it there is no best mark, no worst mark and no peak given back — so the questions that turn on *when* inside a trade (cut-loss latency, gave back the peak, maximum adverse excursion) cannot be asked at all. A daily position mark is what closes this, and it closes most of this group at once.',
  reviewed:
    'Nothing records that a trade was reviewed, so reviewed and unreviewed read the same and every closed trade sits in the queue for ever. The count below is closed trades, not a backlog.',
  regime:
    'The design buckets a play’s record by market regime, so a play is only quoted for the regime you are in. No regime read reaches this side, so the rows are the whole sample rather than the relevant slice — which flatters a play that only works in one regime.',
  cap: 'The size cap a play earns is a policy — full allowance, half under twenty trades, none under a profit factor of 1.2 — and that policy has no store on this side, the same one Risk Budget is missing. The stats below are what such a rule would read; nothing reads them yet.',
  proposals:
    'A rule proposal is generated from a habit that has cost something repeatedly: the habit names the behaviour, its cost and its sample, and the proposal turns that into a change to a rule. Five of the seven habits cannot be measured here, and nothing stores a proposal or its outcome, so this page has the shape and no rows.',
} as const

/** A closed trade's own fills, earliest first. */
function orderedTrades(g: OptExecutionGroup): Execution[] {
  return [...g.trades].sort((a, b) => (a.time ?? 0) - (b.time ?? 0) || (a.trade_date ?? '').localeCompare(b.trade_date ?? ''))
}

function isBuy(side: string | undefined): boolean {
  return (side ?? '').toUpperCase().startsWith('B')
}

function dateSpan(trades: readonly Execution[]): { first: string | null; last: string | null } {
  const dates = trades.map((t) => (t.trade_date ?? '').slice(0, 10)).filter(Boolean).sort()
  return { first: dates[0] ?? null, last: dates[dates.length - 1] ?? null }
}

function daysBetween(a: string, b: string): number | null {
  const x = Date.parse(`${a}T00:00:00Z`)
  const y = Date.parse(`${b}T00:00:00Z`)
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  return Math.round((y - x) / 86_400_000)
}

/**
 * The closed trades, newest close first.
 *
 * A contract the fills have taken flat is closed. A contract still showing a
 * position whose expiry has passed is closed too — economically it is over —
 * but the broker has not booked the expiry, so it carries no closing fill and
 * is counted separately rather than folded in with a realised figure it does
 * not have.
 */
export function buildReviewTrades(executions: readonly Execution[]): {
  trades: ReviewTrade[]
  /** Contracts past expiry that the fills never closed — over, but unbooked. */
  expiredUnbooked: number
} {
  const groups = buildOptExecutionGroups([...executions])
  const trades: ReviewTrade[] = []
  let expiredUnbooked = 0

  for (const g of groups) {
    if (g.status !== 'realized') {
      if (isOptionExpired(g.expiry)) expiredUnbooked += 1
      continue
    }
    const ordered = orderedTrades(g)
    const opener = ordered[0]
    const shortPremium = opener != null && !isBuy(opener.side)
    const { first, last } = dateSpan(ordered)
    const entryPremium = shortPremium ? g.sell_premium : g.buy_cost
    const exitPremium = shortPremium ? g.buy_cost : g.sell_premium
    trades.push({
      contractKey: g.contract_key,
      label: shortOptContractKey(g.contract_key),
      symbol: g.symbol,
      accountId: g.account_id,
      play: ordered.find((t) => t.strategy_opportunity_name)?.strategy_opportunity_name ?? null,
      openedOn: first,
      closedOn: last,
      daysHeld: first && last ? daysBetween(first, last) : null,
      dteAtEntry: first ? daysTo(g.expiry, first) : null,
      contracts: Math.max(g.buy_volume, g.sell_volume),
      realised: g.realized_pnl,
      win: g.realized_pnl > 0,
      // Every group here is flat by fills; the expiry case never reaches this
      // branch, which is why the count above is kept apart.
      exitKind: 'closed',
      shortPremium,
      entryPremium,
      exitPremium,
      creditKept: shortPremium && entryPremium > 0 ? 1 - exitPremium / entryPremium : null,
    })
  }

  trades.sort((a, b) => (b.closedOn ?? '').localeCompare(a.closedOn ?? '') || a.label.localeCompare(b.label))
  return { trades, expiredUnbooked }
}

/** Under this many trades, the design shows the band rather than the point. */
export const THIN_SAMPLE = 20

export interface PlayStat {
  play: string
  n: number
  wins: number
  winRate: number
  /** 95% band on the win rate — the honest reading at these sample sizes. */
  bandLow: number
  bandHigh: number
  thin: boolean
  /** Median share of the credit kept, over the short-premium trades in the play. */
  creditKept: number | null
  avgDaysHeld: number | null
  avgDteAtEntry: number | null
  realised: number
  avgRealised: number
  best: number
  worst: number
  /** Gross win over gross loss. Null when the play has never lost. */
  profitFactor: number | null
}

/**
 * A Wilson interval on the win rate.
 *
 * A normal approximation on eleven trades puts the band outside 0–1 and reads
 * as precision the sample cannot support; Wilson stays inside and widens
 * honestly as n falls, which is the whole point of showing a band here.
 */
export function winRateBand(wins: number, n: number, z = 1.96): { low: number; high: number } {
  if (n <= 0) return { low: 0, high: 1 }
  const p = wins / n
  const d = 1 + (z * z) / n
  const centre = p + (z * z) / (2 * n)
  const spread = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))
  return { low: Math.max(0, (centre - spread) / d), high: Math.min(1, (centre + spread) / d) }
}

function median(values: readonly number[]): number | null {
  if (values.length === 0) return null
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid]
}

function mean(values: readonly number[]): number | null {
  return values.length === 0 ? null : values.reduce((a, b) => a + b, 0) / values.length
}

/** What each play has actually done, largest sample first. */
export function playbookStats(trades: readonly ReviewTrade[]): PlayStat[] {
  const byPlay = new Map<string, ReviewTrade[]>()
  for (const t of trades) {
    const play = t.play ?? 'no play recorded'
    byPlay.set(play, [...(byPlay.get(play) ?? []), t])
  }
  const out: PlayStat[] = []
  for (const [play, list] of byPlay) {
    const wins = list.filter((t) => t.win).length
    const band = winRateBand(wins, list.length)
    const grossWin = list.filter((t) => t.realised > 0).reduce((a, t) => a + t.realised, 0)
    const grossLoss = list.filter((t) => t.realised < 0).reduce((a, t) => a - t.realised, 0)
    out.push({
      play,
      n: list.length,
      wins,
      winRate: wins / list.length,
      bandLow: band.low,
      bandHigh: band.high,
      thin: list.length < THIN_SAMPLE,
      creditKept: median(list.filter((t) => t.creditKept != null).map((t) => t.creditKept as number)),
      avgDaysHeld: mean(list.filter((t) => t.daysHeld != null).map((t) => t.daysHeld as number)),
      avgDteAtEntry: mean(list.filter((t) => t.dteAtEntry != null).map((t) => t.dteAtEntry as number)),
      realised: list.reduce((a, t) => a + t.realised, 0),
      avgRealised: list.reduce((a, t) => a + t.realised, 0) / list.length,
      best: Math.max(...list.map((t) => t.realised)),
      worst: Math.min(...list.map((t) => t.realised)),
      profitFactor: grossLoss > 0 ? grossWin / grossLoss : null,
    })
  }
  return out.sort((a, b) => b.n - a.n || a.play.localeCompare(b.play))
}

export interface HabitReading {
  key: string
  label: string
  unit: string
  /** The reading, when the whole habit can be measured. */
  value: number | null
  n: number
  /** What the reading says, in the register the design uses. */
  read: string
  /** The half of the habit that cannot be measured here, when there is one. */
  unmeasured: string | null
}

/**
 * The habits the design names, and which of them the ledger can answer.
 *
 * Five of the seven turn on the plan or the mark path. They keep their place
 * and say which half is missing — a habits page that listed only the two it can
 * measure would read as a short list of tendencies rather than a long one
 * mostly unmeasured.
 */
export function habitReadings(trades: readonly ReviewTrade[]): HabitReading[] {
  const held = trades.filter((t) => t.daysHeld != null).map((t) => t.daysHeld as number)
  const dte = trades.filter((t) => t.dteAtEntry != null).map((t) => t.dteAtEntry as number)
  const kept = trades.filter((t) => t.creditKept != null).map((t) => t.creditKept as number)
  const shortDte = dte.filter((d) => d < 30).length
  const avgHeld = mean(held)
  const avgDte = mean(dte)
  const medKept = median(kept)

  return [
    {
      key: 'hold_time',
      label: 'Hold time vs plan',
      unit: 'days',
      value: avgHeld,
      n: held.length,
      read:
        avgHeld == null
          ? 'no closed trade carries both a first and a last fill date'
          : `Trades are held ${avgHeld.toFixed(0)} days on average, over ${held.length} closed.`,
      unmeasured: 'against what the plan said — no plan is linked to a position, so there is no planned bar to compare with',
    },
    {
      key: 'dte_entry',
      label: 'DTE at entry',
      unit: 'days',
      value: avgDte,
      n: dte.length,
      read:
        avgDte == null
          ? 'no closed trade carries an open date and an expiry'
          : `Written at ${avgDte.toFixed(0)} days to expiry on average; ${shortDte} inside 30.`,
      unmeasured: null,
    },
    {
      key: 'credit_kept',
      label: 'Credit kept on short premium',
      unit: 'of credit',
      value: medKept,
      n: kept.length,
      read:
        medKept == null
          ? 'no short-premium trade carries an entry credit'
          : `Half of the ${kept.length} short-premium trades kept ${(medKept * 100).toFixed(0)}% of the credit or more.`,
      unmeasured: null,
    },
    {
      key: 'disposition',
      label: 'Winner trimming (disposition effect)',
      unit: 'of winners',
      value: null,
      n: trades.filter((t) => t.win).length,
      read: 'Cutting a winner before the plan said to is the behaviour; the plan is the half that is missing.',
      unmeasured: 'which winners were cut early — it needs the planned exit',
    },
    {
      key: 'cut_latency',
      label: 'Cut-loss latency',
      unit: 'days past the worst mark',
      value: null,
      n: trades.filter((t) => !t.win).length,
      read: 'How long a loser stayed open after its worst mark is the reading.',
      unmeasured: 'the worst mark itself — it needs the mark through the holding period',
    },
    {
      key: 'gave_back',
      label: 'Gave back the peak',
      unit: 'of best',
      value: null,
      n: trades.length,
      read: 'What share of the best mark a trade actually landed.',
      unmeasured: 'the best mark — it needs the mark through the holding period',
    },
    {
      key: 'capture',
      label: 'Plan capture of best available',
      unit: 'of best',
      value: null,
      n: trades.length,
      read: 'What the plan was aiming at, against what the trade actually printed.',
      unmeasured: 'both halves — the planned exit and the best mark',
    },
  ]
}
