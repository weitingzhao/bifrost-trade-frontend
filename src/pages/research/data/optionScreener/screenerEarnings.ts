/**
 * Days to earnings on the Option screen — the design's `earnings Nd` on each
 * group row, and the one input its earnings filter needs.
 *
 * The source is Research's `GET /research/narrative/earnings` (0.125.0+): the
 * feed carries no forward calendar, so the next print is last year's same
 * quarter plus 52 weeks, with the rule's own record on the name. Measured on
 * DEV 2026-09-27: LMT 24d, V 31d, MDT 52d, PLTR 37d, each 4 of 4 prints inside
 * the rule's miss window; an ETF with no 8-K on file (SGOV) answers null.
 *
 * The earnings filter used to be sent to the engine, which accepts
 * `include_earnings_span` and never reads it — the toggle re-screened and
 * excluded nothing (walk 2026-09-27). It is applied here, by the prototype's
 * rule: a contract spans earnings when the expected print falls on or before
 * its expiry.
 */
import type { EarningsReading } from '@/utils/earningsReading'

/**
 * The prototype's rule: a contract spans earnings when the print falls on or
 * before its expiry. A late print (days below zero) is still ahead of every
 * contract, so it spans them all; a name with no reading spans nothing — there
 * is no date to exclude against, and the group row says so.
 */
export function spansEarnings(dte: number, reading: EarningsReading | undefined): boolean {
  if (!reading || reading.kind === 'none') return false
  return reading.next.daysAway <= dte
}

/**
 * The group row's `earnings Nd`, and its hover. A print overdue by more than
 * the rule has ever missed on this name is flagged: either it is late or the
 * filings feed has not carried it (MU on 2026-09-27: expected 22 Sep by a rule
 * that had landed within a day 4 of 4 times, no results 8-K since June, while
 * the feed carried other names' prints that week). It still counts as ahead —
 * the safe reading for a short put — and the hover says so.
 */
export function earningsLabel(reading: EarningsReading | undefined): { text: string; title: string; warn: boolean } {
  if (!reading) return { text: 'earnings …', title: 'Reading the next print', warn: false }
  if (reading.kind === 'none') return { text: 'earnings —', title: reading.reason, warn: false }
  const { daysAway, date, track, lastResult } = reading.next
  const record =
    track.n > 0 && track.maxMissDays != null
      ? ` On this name the rule landed within ${track.maxMissDays} day${track.maxMissDays === 1 ? '' : 's'} on ${track.n} of ${track.n} prints.`
      : ''
  const estimate = `Expected ${date} — an estimate: last year's same-quarter print plus 52 weeks.${record}`
  if (daysAway >= 0) return { text: `earnings ${daysAway}d`, title: estimate, warn: false }
  const beyondRecord = -daysAway > (track.maxMissDays ?? 0)
  return {
    text: `earnings late ${-daysAway}d`,
    title:
      `${estimate} No results filing on file since ${lastResult ?? 'the feed began'}` +
      (beyondRecord ? ', later than the rule has ever missed here — the print is late, or the filings feed has not carried it.' : '.') +
      ' Counted as still ahead, so every contract spans it; Include lets them through.',
    warn: beyondRecord,
  }
}
