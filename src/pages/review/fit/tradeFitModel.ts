/**
 * What the Single trade page says about one closed trade.
 *
 * The design's shape is a diff, and the diff has two halves. The **path** half
 * — best mark, worst mark, how much of the best the exit landed, how long a
 * loser stayed open past its low — is read off the contract's own daily bars.
 * The **plan** half — what the trade was aiming at and when it said to be out —
 * has no store, so every row that needs it keeps its place and says so.
 *
 * Every derivation lives here rather than in the components, so the
 * counterfactual table, the timeline and the tags cannot describe the same
 * trade differently.
 */
import { daysBetween } from '@/lib/isoDate'
import { fmtIsoDateToken } from '@/lib/format'
import { fmtUsd } from '@/utils/positions'
import type { ExpiryBranch, MarkPath } from '@/utils/reviewMarkPath'
import type { ReviewTrade } from '@/utils/reviewTrades'

export type Tone = 'success' | 'warning' | 'danger' | 'neutral'

export interface Counterfactual {
  key: string
  name: string
  /** The session it reads off, or null when it cannot be priced. */
  when: string | null
  /** P&L, or null when the branch needs something absent. */
  pl: number | null
  /** Against the realised figure. Null on the realised row itself and on n/c rows. */
  delta: number | null
  meaning: string
  /** The row that *is* the realised number — the one everything else is measured against. */
  self?: boolean
}

export interface TimelineStage {
  key: string
  stage: string
  title: string
  sub: string
  when: string | null
  tone: Tone
}

export interface DerivedTag {
  key: string
  label: string
  why: string
  tone: Tone
  /** True when the path cannot answer it — the tag keeps its place and is marked. */
  unreadable?: boolean
}

export interface SourceRow {
  key: string
  lamp: 'green' | 'yellow' | 'gray'
  title: string
  sub: string
}

/** Below this the give-back is noise rather than a habit. */
const GIVE_BACK_FLOOR = 50
/** A loser that sat this long past its worst mark is a slow cut, not a judgement call. */
const SLOW_CUT_DAYS = 5

export function counterfactuals(
  trade: ReviewTrade,
  path: MarkPath | null,
  expiry: ExpiryBranch | null,
  today: string,
): Counterfactual[] {
  const realised = trade.realised
  const rows: Counterfactual[] = [
    {
      key: 'actual',
      name: 'What I did',
      when: trade.closedOn,
      pl: realised,
      delta: null,
      meaning: 'The realised figure the Trade Ledger carries. Everything below is measured against it.',
      self: true,
    },
    {
      key: 'plan',
      name: 'My plan’s exit',
      when: null,
      pl: null,
      delta: null,
      meaning:
        'No plan was ever linked to this position, so there is no planned exit to price. Not zero — absent.',
    },
  ]

  if (path) {
    rows.push({
      key: 'best',
      name: 'Best mark printed',
      when: path.bestDate,
      pl: path.best,
      delta: path.best - realised,
      meaning:
        'The highest the position ever marked while it was held. Only reachable with hindsight — it is a ceiling on the plan, not a target.',
    })
  }

  rows.push(
    expiry
      ? {
          key: 'expiry',
          name: trade.closedOn === expiry.date ? 'Held to expiry · this is what I did' : 'Held to expiry',
          when: expiry.date,
          pl: expiry.pl,
          delta: expiry.pl - realised,
          meaning:
            expiry.intrinsic > 0
              ? `The do-nothing branch: ${trade.underlying} settled at ${expiry.underlying.toFixed(2)} against a ${trade.strike} strike, so the contract was worth ${expiry.intrinsic.toFixed(2)} at expiry. Exact, not modelled.`
              : `The do-nothing branch: ${trade.underlying} settled at ${expiry.underlying.toFixed(2)}, leaving the ${trade.strike} strike out of the money and the contract worthless. Exact, not modelled.`,
        }
      : {
          key: 'expiry',
          name: 'Held to expiry',
          when: null,
          pl: null,
          delta: null,
          meaning:
            trade.expiry >= today
              ? `This contract expires ${fmtIsoDateToken(trade.expiry)} and has not settled, so there is no expiry price to hold to. Marking it at today’s close would be a different branch wearing this one’s name.`
              : 'The underlying’s close on the expiry session is not on hand for this name, so the branch cannot be priced.',
        },
  )

  if (path) {
    rows.push(
      path.everUnderwater
        ? {
            key: 'worst',
            name: 'Worst mark printed',
            when: path.worstDate,
            pl: path.worst,
            delta: path.worst - realised,
            meaning: 'The risk that was actually live, whether or not it was felt at the time.',
          }
        : {
            key: 'worst',
            name: 'Never underwater',
            when: path.worstDate,
            pl: path.worst,
            delta: path.worst - realised,
            meaning: 'The position never marked below the entry, so there was no drawdown to sit through.',
          },
    )
  }

  return rows
}

export function timeline(trade: ReviewTrade, path: MarkPath | null): TimelineStage[] {
  const stages: TimelineStage[] = [
    {
      key: 'plan',
      stage: 'plan',
      title: 'No written plan',
      sub: 'Nothing to measure adherence against. The discipline reading on this trade is blank by construction, not by accident.',
      when: null,
      tone: 'neutral',
    },
    {
      key: 'entry',
      stage: 'entry',
      title: `${trade.contracts} × ${trade.right === 'P' ? 'put' : 'call'} · K ${trade.strike}`,
      sub: `${trade.dteAtEntry ?? '—'} days to expiry at entry, ${trade.shortPremium ? 'credit' : 'debit'} of ${fmtUsd(Math.abs(trade.entryPremium), true)}.`,
      when: trade.openedOn,
      tone: 'success',
    },
  ]

  if (path && path.bestDate !== trade.closedOn && path.best > trade.realised) {
    stages.push({
      key: 'peak',
      stage: 'peak',
      title: `Best mark ${fmtUsd(path.best, true)}`,
      sub: `From here the position gave back ${fmtUsd(path.best - trade.realised, true)} before I was out.`,
      when: path.bestDate,
      tone: 'warning',
    })
  }

  if (path && path.everUnderwater && path.worstDate !== trade.closedOn) {
    const held = daysBetween(path.worstDate, trade.closedOn)
    stages.push({
      key: 'drawdown',
      stage: 'drawdown',
      title: `Worst mark ${fmtUsd(path.worst, true)}`,
      sub: `The position stayed open ${held ?? '—'} more days after marking here.`,
      when: path.worstDate,
      tone: 'danger',
    })
  }

  stages.push({
    key: 'exit',
    stage: 'exit',
    title: `${trade.exitKind === 'expired' ? 'Expired' : 'Closed by fill'} · ${fmtUsd(trade.realised, true)}`,
    sub:
      trade.daysHeld == null
        ? 'The fills carry no span for this trade.'
        : `Held ${trade.daysHeld} days, over ${trade.fills.length} ${trade.fills.length === 1 ? 'fill' : 'fills'}.`,
    when: trade.closedOn,
    tone: trade.realised >= 0 ? 'success' : 'danger',
  })

  return stages
}

export function derivedTags(trade: ReviewTrade, path: MarkPath | null): DerivedTag[] {
  const tags: DerivedTag[] = []

  if (path) {
    const gaveBack = path.best - trade.realised
    if (gaveBack >= GIVE_BACK_FLOOR && path.captureOfBest != null) {
      tags.push({
        key: 'gave-back',
        label: 'gave back the peak',
        why: `Landed ${Math.round(path.captureOfBest * 100)}% of the best mark; ${fmtUsd(gaveBack, true)} was on the table on ${fmtIsoDateToken(path.bestDate)} and not taken.`,
        tone: 'warning',
      })
    } else if (path.captureOfBest != null) {
      tags.push({
        key: 'took-the-peak',
        label: 'exited at or near the peak',
        why: `The exit landed ${Math.round(path.captureOfBest * 100)}% of the best mark the trade ever printed.`,
        tone: 'success',
      })
    }

    if (path.everUnderwater) {
      tags.push({
        key: 'drawdown',
        label: 'sat through a drawdown',
        why: `Marked ${fmtUsd(path.worst, true)} against me on ${fmtIsoDateToken(path.worstDate)} — the adverse excursion this trade actually carried.`,
        tone: 'danger',
      })
    } else {
      tags.push({
        key: 'never-underwater',
        label: 'never underwater',
        why: 'The position did not mark below the entry on any session it was held.',
        tone: 'success',
      })
    }

    if (!trade.win && path.cutLatencyDays != null && path.cutLatencyDays >= SLOW_CUT_DAYS) {
      tags.push({
        key: 'slow-cut',
        label: 'slow cut',
        why: `A losing position stayed open ${path.cutLatencyDays} days past its worst mark.`,
        tone: 'danger',
      })
    }
  }

  tags.push({
    key: 'plan-tags',
    label: 'held past plan · exited early',
    why: 'Both are statements about the exit against the planned bar, and no plan is linked to this position.',
    tone: 'neutral',
    unreadable: true,
  })

  return tags
}

export function sources(
  trade: ReviewTrade,
  path: MarkPath | null,
  underlyingBars: number,
  optionTicker: string | null,
): SourceRow[] {
  const partial = path != null && path.businessDays > 0 && path.bars < path.businessDays * 0.8
  return [
    {
      key: 'plan',
      lamp: 'gray',
      title: 'Plan record · absent',
      sub: 'Trade Plans stores a target and a stop, but nothing links one to a position. The plan exit, both gaps and two of the tags are withheld on that.',
    },
    {
      key: 'fills',
      lamp: 'green',
      title: `Fills · ${trade.fills.length}`,
      sub: 'The Trade Ledger’s own, with their dates, sides, quantities and prices. The realised figure is their cash, summed.',
    },
    {
      key: 'marks',
      lamp: path == null ? 'gray' : partial ? 'yellow' : 'green',
      title:
        path == null
          ? `Contract daily marks · none${optionTicker ? ` for ${optionTicker}` : ''}`
          : `Contract daily marks · ${path.bars} of ${path.businessDays} sessions`,
      sub:
        path == null
          ? 'Without them there is no best mark, no worst mark and no path — the counterfactuals below stay marked.'
          : partial
            ? 'Partial: the vendor has no bar for some sessions this was held, so best and worst are the best of what exists, not of every day.'
            : 'market.option_daily, the contract’s own OHLCV. The path ends on the Ledger’s realised figure to the cent.',
    },
    {
      key: 'underlying',
      lamp: underlyingBars > 0 ? 'green' : 'gray',
      title: `Underlying daily closes · ${underlyingBars}`,
      sub:
        underlyingBars > 0
          ? 'Draws the price panel and prices the expiry branch at intrinsic, which at expiry is exact.'
          : 'Not on hand for this name, so the price panel and the expiry branch are withheld.',
    },
    {
      key: 'mid',
      lamp: 'gray',
      title: 'Mid at submit, and IV at fill',
      sub: 'Neither is recorded, so slippage against the standing mid cannot be computed — the one question of the three that a better limit price would answer.',
    },
  ]
}
