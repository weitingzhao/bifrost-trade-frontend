/**
 * The Payoff face's earnings-gap rows (design `isPayoff` · Scenarios): whether
 * the next print — Research's estimate — sits inside the chosen expiry, the
 * move the term structure prices for it, and the sentence under the table.
 * Also where the print falls against the table's T+ column (its mark holds
 * today's IV, so past the print it keeps a premium the crush takes away) and
 * the Expiry select's labels.
 */
import type { ExpectedEarnings } from '@/api/research/narrative'
import {
  eventMove,
  expiryEarnings,
  firstListedAfter,
  lateLead,
  shortDate,
  type EventMove,
  type ExpiryEarnings,
  type TermVol,
} from '@/utils/earningsEstimate'

export interface PayoffEarnings {
  tag: ExpiryEarnings | null
  ev: EventMove | null
  /** The gap the rows use, a fraction of spot; null draws no earnings rows. */
  gap: number | null
  note: string
  /** The face's warning strip when the estimated print has passed with no results 8-K. */
  late: string | null
  /** Whether the T+ column's day is on or past the print; null when the print is not inside the expiry. */
  midAfter: boolean | null
}

const asPct = (x: number) => `${(x * 100).toFixed(1)}%`

/** The strip a late print puts at the top of the face (the shared lead, then what it means here). */
export function lateNotice(e: ExpectedEarnings): string {
  return (
    lateLead(e) +
    ' The print can land inside this expiry any day — or has, and the feed has not caught up — so the scenario table, which cannot place it, carries no earnings rows.'
  )
}

export function payoffEarnings(
  e: ExpectedEarnings | null | undefined,
  term: readonly TermVol[],
  dte: number,
  filings: number | null | undefined,
  midD: number
): PayoffEarnings {
  const none = (note: string, late: string | null = null): PayoffEarnings => ({ tag: null, ev: null, gap: null, note, late, midAfter: null })
  if (!e) {
    return none(
      filings === 0
        ? 'No 8-K on file for this name, so no earnings rows.'
        : 'No next earnings date to estimate — fewer than four quarterly results 8-Ks on file, or the last estimate passed two weeks ago with none — so no earnings rows.'
    )
  }
  if (e.days_away < 0) {
    return none(
      `Earnings were expected about ${shortDate(e.date)} and no results 8-K has arrived — the print is late and its date unknown, so no earnings rows.`,
      lateNotice(e)
    )
  }
  const when = `~${shortDate(e.date)}, estimated`
  const tag = expiryEarnings(e, dte)
  if (!tag) {
    // expiryEarnings tags every expiry the print falls before, so this one ends first.
    return none(`The next print (${when}) falls after this expiry, so it adds no earnings rows — pick an expiry past it on the Chain face to see them.`)
  }
  const midAfter = midD >= e.days_away
  const mid = midAfter
    ? ` T+${midD} falls on or after the print, and the marks hold IV unchanged — so its column still prices the event premium the crush takes away, to a buyer's cost and a seller's gain.`
    : ` T+${midD} falls before the print, so its mark still carries the event premium.`
  const ev = eventMove(term, e.days_away)
  if (!ev) {
    const pts = term.filter((t) => t.dte > 0 && t.iv > 0)
    const why = !pts.some((t) => t.dte <= e.days_away)
      ? 'no priced expiry before the print to measure against'
      : !pts.some((t) => t.dte > e.days_away)
        ? 'no priced expiry after the print'
        : 'the expiry after it is not priced above the one before'
    return {
      tag,
      ev: null,
      gap: null,
      late: null,
      midAfter,
      note: `The next print (${when}) falls inside this expiry, but the term structure gives no premium to size it — ${why} — so no earnings rows.${mid}`,
    }
  }
  const unsure =
    tag.tag === 'E?' ? ` The estimate sits ${Math.abs(dte - e.days_away)} days from this expiry and has missed this name by up to ${e.track.max_miss_days ?? 7}, so the print may fall outside it.` : ''
  return {
    tag,
    ev,
    gap: ev.move,
    late: null,
    midAfter,
    note:
      `Earnings rows: the next print (${when}) falls inside this expiry, and the gap is the move the term structure prices for it — ATM IV ${asPct(ev.before.iv)} on ${ev.before.expiry.slice(5)} before it against ${asPct(ev.after.iv)} on ${ev.after.expiry.slice(5)} after, ±${asPct(ev.move)}, not σ.` +
      `${mid}${unsure}`,
  }
}

/**
 * The Expiry select's label: the date, and E / E? when the estimated print
 * falls inside it; the first listed expiry after the print says so. A late
 * print marks none — its strip above the face says it can land anywhere.
 */
export function expiryOptionLabel(
  expiry: string,
  dte: number,
  e: ExpectedEarnings | null | undefined,
  listed: readonly string[]
): string {
  if (!e || e.days_away < 0) return expiry
  const tag = expiryEarnings(e, dte)
  if (!tag) return expiry
  return `${expiry} · ${tag.tag}${expiry === firstListedAfter(e, listed) ? ` · first after ~${shortDate(e.date)}` : ''}`
}
