/**
 * The next earnings print on the Symbol page — the Volatility face's amber
 * line and kink note, the Chain face's expiry-card E, and the Payoff face's
 * earnings-gap scenario rows — from Research's estimate
 * (`/research/narrative/earnings` · `expected_next`, research 0.125.0).
 *
 * The date is an estimate, and every sentence that uses it says so: the feed
 * holds no forward calendar, so Research takes last year's same-quarter 8-K
 * plus 52 weeks and reports how the rule has done on this name.
 */
import type { ExpectedEarnings } from '@/api/research/narrative'

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** The design's event window: inside it the front of the curve carries the print. */
export const EVENT_WINDOW_DAYS = 45

/** `2026-11-02` → `2 Nov`; with ``year``, `2 Nov 26`. */
export function shortDate(iso: string, year = false): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return `${d} ${MON[m - 1]}${year ? ` ${String(y).slice(2)}` : ''}`
}

export interface TermEvent {
  dte: number
  label: string
  title: string
}

/** The chart mark, when the estimate is ahead and inside the fitted expiries' span. */
export function termEarningsMark(e: ExpectedEarnings | null | undefined, dtes: readonly number[]): TermEvent | null {
  if (!e || e.days_away < 0 || dtes.length === 0) return null
  if (e.days_away < Math.min(...dtes) || e.days_away > Math.max(...dtes)) return null
  return {
    dte: e.days_away,
    label: `E ~${shortDate(e.date)}`,
    title: `Next earnings estimated ${e.date} — ${e.basis} (${e.from})`,
  }
}

/**
 * The first listed expiry after the estimate — the one carrying the event
 * premium. Strictly after: an expiry on the print's own day may expire first.
 */
export function firstExpiryAfter<T extends { dte: number }>(e: ExpectedEarnings | null | undefined, term: readonly T[]): T | null {
  if (!e || e.days_away < 0) return null
  return [...term].sort((a, b) => a.dte - b.dte).find((t) => t.dte > e.days_away) ?? null
}

/** The estimate's own disclaimer: how it was made and how it has done on the name. */
export function estimateCaveat(e: ExpectedEarnings): string {
  const t = e.track
  const record =
    t.n > 0 && t.median_miss_days != null && t.max_miss_days != null
      ? t.max_miss_days === 0
        ? ` On this name it landed on the day for each of the last ${t.n} prints.`
        : ` On this name the rule missed its last ${t.n} prints by a median of ${t.median_miss_days} day${t.median_miss_days === 1 ? '' : 's'} (at most ${t.max_miss_days}).`
      : ''
  return `The date is an estimate: last year's same-quarter print (${shortDate(e.from, true)}) plus 52 weeks.${record}`
}

/**
 * The panel's earnings sentence. ``filings`` is the name's 8-Ks on file at all,
 * so a name the feed never carried is not read as a name with no earnings.
 */
export function termEarningsNote(
  e: ExpectedEarnings | null | undefined,
  term: readonly { label: string; dte: number }[],
  filings: number | null | undefined
): string {
  if (!e) {
    return filings === 0
      ? 'No 8-K on file for this name, so no earnings date to mark — a fund files none, and the SEC feed covers only the market-data plugin’s list.'
      : 'No next earnings date to mark: the name has fewer than four quarterly results 8-Ks on file to estimate from, or the last estimate passed two weeks ago with none.'
  }
  if (e.days_away < 0) {
    return `Earnings were expected about ${shortDate(e.date)} and no results 8-K has arrived — the print is late or the feed has not caught up, so nothing is marked. ${estimateCaveat(e)}`
  }
  const when = `~${shortDate(e.date)} (${e.days_away}d)`
  if (e.days_away > EVENT_WINDOW_DAYS) {
    return `No earnings expected inside ${EVENT_WINDOW_DAYS} days — the next is ${when}. ${estimateCaveat(e)}`
  }
  const after = firstExpiryAfter(e, term)
  const lastDte = term.length > 0 ? Math.max(...term.map((t) => t.dte)) : null
  const offChart = lastDte != null && e.days_away > lastDte ? ', past the last expiry shown' : ''
  const kink = after
    ? ` — the ${after.label} expiry is the first after it and carries the event premium. Selling across it is what every CSP rule refuses; a calendar that sells the front and owns the back is the structure the slope pays for.`
    : '.'
  return `Earnings expected ${when}${offChart}${kink} ${estimateCaveat(e)}`
}

/** When a name has no record, the rule's 90th-percentile miss across the feed. */
export const DEFAULT_SLACK_DAYS = 7

export type ExpiryEarnings = { tag: 'E' | 'E?'; title: string }

/**
 * The Chain face's card tag. `E` when the estimated print falls before the
 * expiry (the design's rule); `E?` when the expiry sits within the estimate's
 * own error on this name, either side, so the print may land in or out of it.
 */
export function expiryEarnings(e: ExpectedEarnings | null | undefined, dte: number): ExpiryEarnings | null {
  if (!e) return null
  if (e.days_away < 0) {
    // A late print can land before any expiry still listed — or already has.
    return {
      tag: 'E?',
      title: `Earnings late — expected ~${shortDate(e.date)}, no results 8-K yet; it can land before this expiry any day, or has and the feed has not caught up`,
    }
  }
  const slack = e.track.max_miss_days ?? DEFAULT_SLACK_DAYS
  const gap = dte - e.days_away
  const when = `Earnings expected ~${shortDate(e.date)} (estimated)`
  if (Math.abs(gap) <= slack && slack > 0) {
    return {
      tag: 'E?',
      title: `${when}, ${Math.abs(gap)}d ${gap >= 0 ? 'before' : 'after'} this expiry — the estimate has missed this name by up to ${slack}d, so it may land either side`,
    }
  }
  if (gap > 0) return { tag: 'E', title: `${when} — inside this expiry` }
  return null
}

/**
 * The first half of a late print's warning, shared by the faces that raise it:
 * when it was expected and on what, how late it is, and whether that is later
 * than the estimate has ever missed on this name — then the lateness itself is
 * the reading. Each face adds what it means for its own view.
 */
export function lateLead(e: ExpectedEarnings): string {
  const late = -e.days_away
  const max = e.track.max_miss_days
  const record =
    max != null && e.track.n > 0
      ? late > max
        ? ` That is later than this estimate has missed this name before (at most ${max} ${max === 1 ? 'day' : 'days'} over ${e.track.n} prints).`
        : ` The estimate has missed this name by up to ${max} ${max === 1 ? 'day' : 'days'}, so this may still be the usual slack.`
      : ''
  return (
    `Earnings late: expected ~${shortDate(e.date)} (last year's ${shortDate(e.from, true)} plus 52 weeks) and no results 8-K has arrived, ${late} ${late === 1 ? 'day' : 'days'} on.` +
    record
  )
}

/** The Chain face header's earnings reading. */
export function earningsHeadMeta(e: ExpectedEarnings | null | undefined): string | null {
  if (!e) return null
  return e.days_away >= 0 ? `earnings ~${e.days_away}d (est.)` : 'earnings late'
}

/** The legend's entry for the mark. */
export function termEarningsLegend(e: ExpectedEarnings | null | undefined, mark: TermEvent | null): string | null {
  if (mark && e) return `next earnings ~${shortDate(e.date)} (estimated)`
  return null
}

export interface TermVol {
  expiry: string
  dte: number
  /** ATM vol, a fraction. */
  iv: number
}

export interface EventMove {
  /** Expected absolute move on the print, a fraction of spot: σ_event × √(2/π). */
  move: number
  /** One standard deviation of the print's own move, a fraction of spot. */
  sigma: number
  before: TermVol
  after: TermVol
}

/**
 * The move the term structure prices for the print — the design's "event
 * premium as the gap size". The expiry just after the print holds its
 * variance, the one just before does not; with the before-expiry's vol as the
 * run rate, the print's own variance is (σ_after² − σ_before²) × T_after. Null
 * without an expiry on each side of the print, or when the after-expiry's vol
 * is not above the before-expiry's (no premium to read).
 */
export function eventMove(term: readonly TermVol[], daysAway: number): EventMove | null {
  const pts = [...term].filter((t) => t.dte > 0 && t.iv > 0).sort((a, b) => a.dte - b.dte)
  const before = [...pts].reverse().find((t) => t.dte <= daysAway)
  const after = pts.find((t) => t.dte > daysAway)
  if (!before || !after) return null
  const variance = (after.iv ** 2 - before.iv ** 2) * (after.dte / 365)
  if (variance <= 0) return null
  const sigma = Math.sqrt(variance)
  return { move: sigma * Math.sqrt(2 / Math.PI), sigma, before, after }
}

/** The design's gate: earnings this close refuse every short-premium rule. */
export const EARNINGS_GATE_DAYS = 10

/** The Overview's Events row for the next print. */
export function earningsRow(
  e: ExpectedEarnings | null | undefined,
  filings: number | null | undefined
): { value: string; means: string } {
  if (!e) {
    return filings === 0
      ? { value: 'no 8-K on file', means: 'A fund files none, and the SEC feed covers only the market-data plugin’s list.' }
      : {
          value: '—',
          means: 'Fewer than four quarterly results 8-Ks on file to estimate from, or the last estimate passed two weeks ago with none.',
        }
  }
  if (e.days_away < 0) {
    return {
      value: `late · expected ~${shortDate(e.date)}`,
      means: `No results 8-K has arrived — the print is late or the feed has not caught up. ${estimateCaveat(e)}`,
    }
  }
  return {
    value: `~${e.days_away} ${e.days_away === 1 ? 'day' : 'days'} · ${shortDate(e.date)} (est.)`,
    means: estimateCaveat(e),
  }
}

export interface EarningsGate {
  headline: string
  tone: 'danger' | 'warning' | 'neutral'
  lamp: 'red' | 'yellow' | 'gray'
}

/** The Events card's verdict and lamp from the next print; null without an estimate. */
export function earningsGate(e: ExpectedEarnings | null | undefined): EarningsGate | null {
  if (!e) return null
  if (e.days_away < 0) {
    return { headline: 'Earnings late — the estimate passed with no results 8-K', tone: 'warning', lamp: 'yellow' }
  }
  if (e.days_away <= EARNINGS_GATE_DAYS) {
    return { headline: `Earnings in ~${e.days_away}d (estimated) — every CSP rule refuses`, tone: 'danger', lamp: 'red' }
  }
  return { headline: `No earnings inside ${EARNINGS_GATE_DAYS} days`, tone: 'neutral', lamp: 'gray' }
}

/**
 * The two earnings-gap levels, spot × (1 ∓ move), as the Chain and Payoff faces
 * print them: whole dollars at 50 and above, cents below.
 */
export function gapLevels(spot: number, move: number): { lo: number; hi: number } {
  const px = (x: number) => Number(x.toFixed(x < 50 ? 2 : 0))
  return { lo: px(spot * (1 - move)), hi: px(spot * (1 + move)) }
}

/** The Overview's gap row: the move the ATM term prices for the print, and where it is read. */
export function gapRow(ev: EventMove): { value: string; means: string } {
  return {
    value: `±${(ev.move * 100).toFixed(1)}% priced`,
    means: `The move the ATM term prices for the estimated print — ${(ev.before.iv * 100).toFixed(1)}% on ${ev.before.expiry.slice(5)} before it against ${(ev.after.iv * 100).toFixed(1)}% on ${ev.after.expiry.slice(5)} after — as the Chain and Payoff faces size the gap.`,
  }
}
