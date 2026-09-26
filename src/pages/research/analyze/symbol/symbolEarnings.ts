/**
 * The next earnings print on the Volatility face's term structure — the
 * design's amber line and its kink note — from Research's estimate
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

/** The first listed expiry on or after the estimate — the one carrying the event premium. */
export function firstExpiryAfter<T extends { dte: number }>(e: ExpectedEarnings | null | undefined, term: readonly T[]): T | null {
  if (!e || e.days_away < 0) return null
  return [...term].sort((a, b) => a.dte - b.dte).find((t) => t.dte >= e.days_away) ?? null
}

function caveat(e: ExpectedEarnings): string {
  const t = e.track
  const record =
    t.n > 0 && t.median_miss_days != null && t.max_miss_days != null
      ? t.max_miss_days === 0
        ? ` On this name it landed on the day for each of the last ${t.n} prints.`
        : ` On this name the rule missed its last ${t.n} prints by a median of ${t.median_miss_days} days (at most ${t.max_miss_days}).`
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
    return `Earnings were expected about ${shortDate(e.date)} and no results 8-K has arrived — the print is late or the feed has not caught up, so nothing is marked. ${caveat(e)}`
  }
  const when = `~${shortDate(e.date)} (${e.days_away}d)`
  if (e.days_away > EVENT_WINDOW_DAYS) {
    return `No earnings expected inside ${EVENT_WINDOW_DAYS} days — the next is ${when}. ${caveat(e)}`
  }
  const after = firstExpiryAfter(e, term)
  const lastDte = term.length > 0 ? Math.max(...term.map((t) => t.dte)) : null
  const offChart = lastDte != null && e.days_away > lastDte ? ', past the last fitted expiry, so it is not on the chart' : ''
  const kink = after
    ? ` — the ${after.label} expiry is the first after it and carries the event premium. Selling across it is what every CSP rule refuses; a calendar that sells the front and owns the back is the structure the slope pays for.`
    : '.'
  return `Earnings expected ${when}${offChart}${kink} ${caveat(e)}`
}

/** The legend's entry for the mark. */
export function termEarningsLegend(e: ExpectedEarnings | null | undefined, mark: TermEvent | null): string | null {
  if (mark && e) return `next earnings ~${shortDate(e.date)} (estimated)`
  return null
}
