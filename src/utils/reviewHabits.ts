/**
 * The habits the design names, and which of them this book can answer.
 *
 * A habit is a claim about repeated behaviour, so it needs three things: a
 * sample, a distribution, and a consequence in dollars. The design draws all
 * three for each of seven tendencies. Which of them are readings here turns on
 * two stores:
 *
 * - The **mark path** — the contract's own daily bars. Present since it was
 *   measured on 2026-09-18, and it is what makes cut-loss latency and the
 *   give-back on winners real rather than marked.
 * - The **plan** a trade was opened under. Absent. Every habit phrased as a
 *   ratio against the plan — held to what share of the planned window, exited
 *   how far past the planned bar, what the plan aimed at against the best mark
 *   — stays marked, and so does every cost, because a cost is what happened
 *   against what the plan would have produced.
 *
 * Habits that cannot be measured keep their row. A page listing only the
 * answerable ones would read as a short list of tendencies rather than a long
 * one partly unmeasured, and the second is the true state of the book.
 */
import type { MarkPath } from '@/utils/reviewMarkPath'
import type { ReviewTrade } from '@/utils/reviewTrades'

export interface HabitDot {
  key: string
  value: number
  /** The trade's realised P&L — the design colours each dot by whether it earned. */
  realised: number
}

export interface HabitReading {
  key: string
  label: string
  unit: string
  /** The central reading, or null when the habit cannot be measured here. */
  value: number | null
  n: number
  /** Which statistic `value` is — a band has to be about the same one. */
  stat: 'mean' | 'median'
  /** The spread beside the reading: a 95% interval on a mean, the IQR on a median. */
  ci: [number, number] | null
  ciLabel: string
  read: string
  /** What the tendency has cost or earned in dollars, when that is computable. */
  consequence: number | null
  consequenceLabel: string
  dots: HabitDot[]
  /** The line the design draws behind the distribution — a plan, a floor, a target. */
  reference: { value: number; label: string } | null
  /** The half that cannot be measured, when only part of the habit is missing. */
  unmeasured: string | null
  /** How a value in this habit's unit is written. */
  kind: 'days' | 'share' | 'count'
  /**
   * True when this reading comes from the mark path.
   *
   * Callers use it to keep a loading state from reading as an absence: while
   * the bars are in flight "no winning trade has a mark path" is not a finding,
   * it is a sentence the page has not earned yet.
   */
  needsPath?: boolean
}

function mean(values: readonly number[]): number | null {
  return values.length === 0 ? null : values.reduce((a, b) => a + b, 0) / values.length
}

function median(values: readonly number[]): number | null {
  if (values.length === 0) return null
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid]
}

/**
 * A 95% interval on the mean.
 *
 * Withheld under three observations: with n = 2 the standard error is a number
 * the sample cannot support, and a band printed there reads as precision.
 */
export function meanBand(values: readonly number[]): [number, number] | null {
  const n = values.length
  if (n < 3) return null
  const m = mean(values) as number
  const variance = values.reduce((a, v) => a + (v - m) ** 2, 0) / (n - 1)
  const half = 1.96 * Math.sqrt(variance / n)
  return [m - half, m + half]
}

/**
 * The quantile at `q`, linearly interpolated.
 *
 * Used for the spread beside a median and for the strip's own axis. A normal
 * band on these samples is not a description of them: the share of credit kept
 * runs to −23× on a trade that closed for far more than it took in, which drags
 * a mean interval below −100% while the middle of the book sits at 76%.
 */
export function quantile(values: readonly number[], q: number): number | null {
  if (values.length === 0) return null
  const s = [...values].sort((a, b) => a - b)
  const pos = (s.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (pos - lo)
}

/** The interquartile range — the middle half, which is what a median is a middle of. */
export function iqr(values: readonly number[]): [number, number] | null {
  if (values.length < 4) return null
  const lo = quantile(values, 0.25)
  const hi = quantile(values, 0.75)
  return lo == null || hi == null ? null : [lo, hi]
}

/**
 * The range a distribution should be drawn over — Tukey's fences, clipped to
 * the data.
 *
 * A percentile cut is not enough on these samples: five percent of fifty-six
 * trades is still three, and three trades that closed for many times the credit
 * they took in drag the axis to −733% while the middle of the book sits between
 * 28% and 99%. The fences follow the spread of the middle half instead, so one
 * extreme trade widens the axis by a fixed multiple rather than by its own size.
 */
export function plotRange(values: readonly number[]): [number, number] | null {
  if (values.length === 0) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const q = iqr(values)
  if (q == null) return [min, max]
  const spread = q[1] - q[0]
  return [Math.max(min, q[0] - 1.5 * spread), Math.min(max, q[1] + 1.5 * spread)]
}

interface Ctx {
  trades: readonly ReviewTrade[]
  paths: Map<string, MarkPath>
}

function withPath(ctx: Ctx): { trade: ReviewTrade; path: MarkPath }[] {
  const out: { trade: ReviewTrade; path: MarkPath }[] = []
  for (const trade of ctx.trades) {
    const path = ctx.paths.get(trade.contractKey)
    if (path) out.push({ trade, path })
  }
  return out
}

function unmeasured(
  key: string,
  label: string,
  unit: string,
  n: number,
  read: string,
  needs: string,
  kind: HabitReading['kind'],
): HabitReading {
  return {
    key,
    label,
    unit,
    value: null,
    n,
    stat: 'mean',
    ci: null,
    ciLabel: '',
    read,
    consequence: null,
    consequenceLabel: 'a cost is what happened against what the plan would have produced',
    dots: [],
    reference: null,
    unmeasured: needs,
    kind,
  }
}

/** The design's seven, plus the one this book's own fills answer outright. */
export function habitReadings(
  trades: readonly ReviewTrade[],
  paths: Map<string, MarkPath> = new Map(),
): HabitReading[] {
  const ctx = { trades, paths }
  const pathed = withPath(ctx)

  return [
    holdTime(ctx),
    disposition(pathed),
    cutLatency(pathed),
    ivRankAtEntry(trades),
    dteAtEntry(ctx),
    creditKept(ctx),
    planCapture(trades),
    lateExit(trades),
  ]
}

function holdTime({ trades }: Ctx): HabitReading {
  const held = trades.filter((t) => t.daysHeld != null)
  const values = held.map((t) => t.daysHeld as number)
  const avg = mean(values)
  return {
    key: 'hold_vs_plan',
    label: 'Hold time vs plan',
    unit: 'days held',
    value: avg,
    n: values.length,
    stat: 'mean',
    ci: meanBand(values),
    ciLabel: '95%',
    read:
      avg == null
        ? 'No closed trade carries both a first and a last fill date.'
        : `Trades are held ${avg.toFixed(0)} days on average, over ${values.length} closed.`,
    consequence: null,
    consequenceLabel: 'holding longer or shorter than planned is what costs — and the plan is absent',
    dots: held.map((t) => ({ key: t.contractKey, value: t.daysHeld as number, realised: t.realised })),
    reference: null,
    unmeasured:
      'the share of the *planned* window actually held — no plan is linked to a position, so there is no planned bar to divide by',
    kind: 'days',
  }
}

/**
 * Winner trimming, read off the path instead of the plan.
 *
 * The design measures the disposition effect against what the plan asked for.
 * That comparison is not available; what is available is stronger than nothing
 * and weaker than the design's claim, so it is stated as its own thing: on a
 * winner, what share of the best mark the position ever printed did the exit
 * actually land. The dollars left behind are the consequence, and they are real.
 */
function disposition(pathed: { trade: ReviewTrade; path: MarkPath }[]): HabitReading {
  const winners = pathed.filter(({ trade, path }) => trade.win && path.captureOfBest != null)
  const values = winners.map(({ path }) => path.captureOfBest as number)
  const med = median(values)
  const givenBack = winners.reduce((a, { trade, path }) => a + Math.max(0, path.best - trade.realised), 0)
  return {
    key: 'disposition',
    label: 'Winner trimming (disposition effect)',
    unit: 'of the best mark landed',
    value: med,
    n: values.length,
    stat: 'median',
    ci: iqr(values),
    ciLabel: 'IQR',
    read:
      med == null
        ? 'No winning trade has a mark path, so there is no peak to compare the exit against.'
        : `Half of the ${values.length} winners landed ${(med * 100).toFixed(0)}% of the best mark they ever printed or better.`,
    consequence: winners.length === 0 ? null : -givenBack,
    consequenceLabel: 'left on the table across the winners — what the exits did not take',
    dots: winners.map(({ trade, path }) => ({
      key: trade.contractKey,
      value: path.captureOfBest as number,
      realised: trade.realised,
    })),
    needsPath: true,
    reference: { value: 1, label: 'the peak' },
    unmeasured:
      'whether the plan asked for the peak — this is the exit against what the trade offered, not against what I said I wanted',
    kind: 'share',
  }
}

function cutLatency(pathed: { trade: ReviewTrade; path: MarkPath }[]): HabitReading {
  const losers = pathed.filter(({ trade, path }) => !trade.win && path.cutLatencyDays != null)
  const values = losers.map(({ path }) => path.cutLatencyDays as number)
  const avg = mean(values)
  return {
    key: 'cut_latency',
    label: 'Cut-loss latency',
    unit: 'days past the worst mark',
    value: avg,
    n: values.length,
    stat: 'mean',
    ci: meanBand(values),
    ciLabel: '95%',
    read:
      avg == null
        ? 'No losing trade has a mark path, so there is no worst mark to date the exit against.'
        : `A losing position stays open ${avg.toFixed(1)} days past its worst mark on average, over ${values.length}.`,
    consequence: null,
    consequenceLabel: 'what the delay cost needs the exit the plan would have taken',
    dots: losers.map(({ trade, path }) => ({
      key: trade.contractKey,
      value: path.cutLatencyDays as number,
      realised: trade.realised,
    })),
    needsPath: true,
    reference: { value: 0, label: 'the low' },
    unmeasured: null,
    kind: 'days',
  }
}

function ivRankAtEntry(trades: readonly ReviewTrade[]): HabitReading {
  return unmeasured(
    'ivr_entry',
    'IV rank at entry',
    'IV rank',
    trades.length,
    'Where in its own year’s volatility each trade was opened — the design holds it against a rule floor of 40.',
    'the underlying’s implied-volatility rank on the entry date, and the floor it is held against — neither reaches this side',
    'count',
  )
}

function dteAtEntry({ trades }: Ctx): HabitReading {
  const dated = trades.filter((t) => t.dteAtEntry != null)
  const values = dated.map((t) => t.dteAtEntry as number)
  const avg = mean(values)
  const short = values.filter((d) => d < 30).length
  return {
    key: 'dte_entry',
    label: 'DTE at entry',
    unit: 'days to expiry',
    value: avg,
    n: values.length,
    stat: 'mean',
    ci: meanBand(values),
    ciLabel: '95%',
    read:
      avg == null
        ? 'No closed trade carries an open date and an expiry.'
        : `Written at ${avg.toFixed(0)} days to expiry on average; ${short} of ${values.length} inside 30.`,
    consequence: null,
    consequenceLabel: 'no rule on this side states a window to be inside or outside of',
    dots: dated.map((t) => ({ key: t.contractKey, value: t.dteAtEntry as number, realised: t.realised })),
    reference: { value: 30, label: '30 DTE' },
    unmeasured: null,
    kind: 'days',
  }
}

function creditKept({ trades }: Ctx): HabitReading {
  const kept = trades.filter((t) => t.creditKept != null)
  const values = kept.map((t) => t.creditKept as number)
  const med = median(values)
  return {
    key: 'credit_kept',
    label: 'Credit kept on short premium',
    unit: 'of credit',
    value: med,
    n: values.length,
    stat: 'median',
    ci: iqr(values),
    ciLabel: 'IQR',
    read:
      med == null
        ? 'No short-premium trade carries an entry credit.'
        : `Half of the ${values.length} short-premium trades kept ${(med * 100).toFixed(0)}% of the credit or more.`,
    consequence: null,
    consequenceLabel: 'the credit kept is already the outcome, not a deviation from one',
    dots: kept.map((t) => ({ key: t.contractKey, value: t.creditKept as number, realised: t.realised })),
    reference: { value: 1, label: 'all of it' },
    unmeasured: null,
    kind: 'share',
  }
}

function planCapture(trades: readonly ReviewTrade[]): HabitReading {
  return unmeasured(
    'capture',
    'Plan capture of best available',
    'of the best mark',
    trades.length,
    'What the plan aimed at, as a share of the best mark the trade printed — the quality of the plans themselves.',
    'the planned exit. The best mark it would be divided by is read off the contract’s own daily bars; the numerator is what is missing',
    'share',
  )
}

function lateExit(trades: readonly ReviewTrade[]): HabitReading {
  return unmeasured(
    'late_exit',
    'Held past the planned exit',
    'days past plan',
    trades.length,
    'How far past its own planned bar a trade runs, and how often.',
    'the planned bar — the exit dates are all here, and there is nothing to measure them against',
    'days',
  )
}

/** Maximum adverse excursion: how far against me a position marked before it closed. */
export function maeDollars(path: MarkPath | undefined): number | null {
  return path == null ? null : Math.min(0, path.worst)
}
