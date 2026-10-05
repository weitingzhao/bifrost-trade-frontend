/**
 * What Research says about a name's next print — a date, or why there is none.
 *
 * The source is `GET /research/narrative/earnings` (0.125.0+): the feed carries
 * no forward calendar (the vendor's, Benzinga, is outside the plan — the
 * market-data plugin's `/market/capabilities` records it as 403 not entitled),
 * so the next print is an estimate — last year's same-quarter results 8-K plus
 * 52 weeks — with the rule's own record on the name.
 *
 * Shared by the Option screen, the Events Book face and the Calendar's Events
 * layer (§14.2: moved out of the screener when Events became its second
 * reader).
 */
import type { EarningsDates } from '@/api/research/narrative'

export interface NameEarnings {
  /** Calendar days to the expected print (New York); below zero, the print is late. */
  daysAway: number
  /** ISO date of the expected print. */
  date: string
  /** How the rule has done on this name's own prints. */
  track: { n: number; medianMissDays: number | null; maxMissDays: number | null }
  /** The newest results release on file, ISO; null when none. */
  lastResult: string | null
}

/** What the store says about a name's next print: a date, or why there is none. */
export type EarningsReading =
  | { kind: 'expected'; next: NameEarnings }
  | {
      kind: 'none'
      reason: string
      /** The finer class of why — what the Events lanes and the Calendar print. */
      absence: EarningsAbsence
    }

/**
 * Why a name has no estimate, in the store's own terms — so a page can say
 * "an ETF files no 8-K" rather than a bare dash. Read off the same response:
 * `filings` (8-Ks on file at all) and `dates` (the results releases among them).
 */
export type EarningsAbsence =
  | { code: 'no_filings'; text: string }
  | { code: 'no_results'; text: string }
  | { code: 'too_few_results'; text: string }
  | { code: 'no_cadence'; text: string }
  | { code: 'unread'; text: string }

/** Research needs this many results releases on file to estimate the next. */
export const EARNINGS_MIN_RESULTS = 4

export function earningsAbsence(d: EarningsDates | null | undefined): EarningsAbsence {
  if (!d) return { code: 'unread', text: 'no earnings reading' }
  if (d.filings === 0) {
    return { code: 'no_filings', text: 'no 8-K on file — an ETF files none, nor does a foreign issuer (6-K)' }
  }
  if (d.dates.length === 0) {
    return { code: 'no_results', text: `${d.filings} 8-Ks on file, none a results release` }
  }
  if (d.dates.length < EARNINGS_MIN_RESULTS) {
    return {
      code: 'too_few_results',
      text: `listed recently — ${d.dates.length} results release${d.dates.length === 1 ? '' : 's'} on file, ${EARNINGS_MIN_RESULTS} needed to estimate`,
    }
  }
  return {
    code: 'no_cadence',
    text: 'the last four results releases are not a quarterly cadence, or the estimate passed two weeks ago with none',
  }
}

export function readEarnings(d: EarningsDates | null | undefined): EarningsReading {
  if (!d) return { kind: 'none', reason: 'no earnings reading', absence: earningsAbsence(d) }
  const n = d.expected_next
  if (n && Number.isFinite(n.days_away)) {
    return {
      kind: 'expected',
      next: {
        daysAway: n.days_away,
        date: n.date,
        track: { n: n.track.n, medianMissDays: n.track.median_miss_days, maxMissDays: n.track.max_miss_days },
        lastResult: d.dates.length > 0 ? d.dates[d.dates.length - 1] : null,
      },
    }
  }
  const absence = earningsAbsence(d)
  if (d.filings === 0) return { kind: 'none', reason: 'no 8-K on file — the filings feed never carried this name', absence }
  return { kind: 'none', reason: 'no quarterly cadence to estimate the next print from', absence }
}

/** One line per class of absence, for a page that lists the names without an estimate. */
export const EARNINGS_ABSENCE_LABEL: Record<EarningsAbsence['code'], string> = {
  no_filings: 'no 8-K on file — an ETF files none, nor does a foreign issuer (6-K)',
  no_results: '8-Ks on file, none a results release',
  too_few_results: `listed recently — fewer than ${EARNINGS_MIN_RESULTS} results releases to estimate from`,
  no_cadence: 'the last four releases are not a quarterly cadence, or the estimate passed with none',
  unread: 'the earnings read failed',
}
