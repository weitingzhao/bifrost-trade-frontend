/**
 * Earnings on the Scenario face.
 *
 * - The analysis model's close expectation looks 20 sessions ahead. When the
 *   estimated print falls inside them, the ruler carries the gap the ATM term
 *   prices for it, as the Chain and Payoff faces place it; past them, a quiet
 *   tag; late, a warning that it can land any day.
 * - Each forecast session runs into the next session, so the one computed on
 *   a filing's day (or the last before a weekend filing) is the one that runs
 *   into the print. The filing's hour is unknown; a morning release reacts in
 *   the session before, which the mark's title says.
 */
import type { ExpectedEarnings } from '@/api/research/narrative'
import { estimateCaveat, gapLevels, lateLead, shortDate, type EventMove } from '@/utils/earningsEstimate'
import { foldFilings } from './rankPathEarnings'

/** The close expectation's horizon, in sessions. */
export const HORIZON_SESSIONS = 20

/** The date `n` weekdays after `from`; exchange holidays are not counted out. */
export function addWeekdays(from: string, n: number): string {
  const d = new Date(`${from}T00:00:00Z`)
  let left = n
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1)
    const wd = d.getUTCDay()
    if (wd !== 0 && wd !== 6) left -= 1
  }
  return d.toISOString().slice(0, 10)
}

export interface HorizonEarnings {
  tag: { label: string; title: string; tone: 'warning' | 'neutral' }
  note: string | null
  /** The two gap levels, spot × (1 ∓ move), when the print is inside and priced. */
  gap: { lo: number; hi: number; move: number } | null
}

export function horizonEarnings(opts: {
  next: ExpectedEarnings | null | undefined
  /** The session the horizon counts from. */
  from: string
  gap?: EventMove | null
  spot?: number | null
}): HorizonEarnings | null {
  const { next } = opts
  if (!next) return null
  if (next.days_away < 0) {
    return {
      tag: { label: `E ~${shortDate(next.date)}? late`, title: lateLead(next), tone: 'warning' },
      note: `Earnings late — expected ~${shortDate(next.date)}, no results 8-K yet. It can land inside these ${HORIZON_SESSIONS} sessions any day, so no gap is placed on the ruler.`,
      gap: null,
    }
  }
  const end = addWeekdays(opts.from, HORIZON_SESSIONS)
  if (next.date > end) {
    return {
      tag: {
        label: `E ~${shortDate(next.date)} · after the horizon`,
        title: `Next earnings estimated ${next.date}, after these ${HORIZON_SESSIONS} sessions (to ~${shortDate(end)}). ${estimateCaveat(next)}`,
        tone: 'neutral',
      },
      note: null,
      gap: null,
    }
  }
  const lv = opts.gap && opts.spot != null && opts.spot > 0 ? gapLevels(opts.spot, opts.gap.move) : null
  const priced =
    opts.gap && lv
      ? ` — the ATM term prices ±${(opts.gap.move * 100).toFixed(1)}% for it, ${lv.lo} / ${lv.hi} from spot, marked on the ruler`
      : ''
  return {
    tag: { label: `E ~${shortDate(next.date)} · inside`, title: estimateCaveat(next), tone: 'warning' },
    note: `The estimated print ~${shortDate(next.date)} (${next.days_away}d, est.) falls inside these ${HORIZON_SESSIONS} sessions${priced}.`,
    gap: lv && opts.gap ? { ...lv, move: opts.gap.move } : null,
  }
}

/**
 * The forecast sessions that run into a print, keyed by the session's date,
 * valued by the filing's date: filed on or after the session was computed,
 * before the session it forecast.
 */
export function forecastPrints(
  rows: readonly { trade_date: string; target: string | null }[],
  filings: readonly string[]
): Map<string, string> {
  const prints = foldFilings(filings)
  const out = new Map<string, string>()
  for (const r of rows) {
    const end = r.target ?? addWeekdays(r.trade_date, 1)
    const p = prints.find((d) => d >= r.trade_date && d < end)
    if (p) out.set(r.trade_date, p)
  }
  return out
}
