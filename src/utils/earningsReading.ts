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

/**
 * What every estimated print date is, and is not — one sentence for every
 * surface that prints one or names its absence. The vendor's confirmed
 * calendar sits outside the data subscription (403 not entitled): an
 * accepted gap with its seat kept (§15.8), not a missing read or a fault.
 */
export const ESTIMATE_ONLY = 'estimated date only — confirmed dates are not in the data subscription'

/**
 * The window "this week" means where a page asks which names print soon —
 * Today's earnings check and the Limits book's earnings-week premium line —
 * so the two cannot disagree about the same name.
 */
export const EARNINGS_WEEK_DAYS = 7

/** A name whose estimated print falls inside the window, or is late. */
export interface PrintAhead {
  symbol: string
  /** ISO date of the estimated print. */
  date: string
  /** Calendar days to it (New York); below zero, the print is late. */
  daysAway: number
  /** The estimate passed with no results 8-K on file yet — it can land any day. */
  late: boolean
}

export interface PrintsAhead {
  /** Inside the window or late, soonest (latest-overdue) first. */
  ahead: PrintAhead[]
  /** Names Research answered with an estimate past the window. */
  beyond: number
  /** Names Research answered with no estimate, and why. */
  none: { symbol: string; absence: EarningsAbsence }[]
  /** Names whose read failed — unread, not "no estimate". */
  unread: string[]
  /** Names not answered yet. */
  pending: string[]
}

/**
 * Which of `names` print inside `days`, read off `useNamesEarnings`' map.
 * A late estimate counts as inside: the print can land any day until the
 * results 8-K is on file.
 */
export function printsAhead(
  names: readonly string[],
  readings: Readonly<Record<string, EarningsReading>>,
  days: number = EARNINGS_WEEK_DAYS,
): PrintsAhead {
  const out: PrintsAhead = { ahead: [], beyond: 0, none: [], unread: [], pending: [] }
  for (const symbol of [...new Set(names.map((s) => s.trim().toUpperCase()).filter(Boolean))].sort()) {
    const r = readings[symbol]
    if (!r) out.pending.push(symbol)
    else if (r.kind === 'none') {
      if (r.absence.code === 'unread') out.unread.push(symbol)
      else out.none.push({ symbol, absence: r.absence })
    } else if (r.next.daysAway <= days) {
      out.ahead.push({ symbol, date: r.next.date, daysAway: r.next.daysAway, late: r.next.daysAway < 0 })
    } else out.beyond += 1
  }
  out.ahead.sort((a, b) => a.daysAway - b.daysAway || a.symbol.localeCompare(b.symbol))
  return out
}

/** `BALI, PFF (no 8-K on file …) · NNE (8-Ks on file, none a results release)` — names grouped by why. */
export function noneByReason(none: PrintsAhead['none']): string {
  const by = new Map<EarningsAbsence['code'], string[]>()
  for (const n of none) by.set(n.absence.code, [...(by.get(n.absence.code) ?? []), n.symbol])
  return [...by].map(([code, syms]) => `${syms.join(', ')} (${EARNINGS_ABSENCE_LABEL[code]})`).join(' · ')
}
