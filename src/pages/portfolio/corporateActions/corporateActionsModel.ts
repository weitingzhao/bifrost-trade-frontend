/**
 * Events that reshape what the book holds, and what they do to a contract.
 *
 * Two different questions live here and they must not be blurred. A dividend
 * that has already been paid is cash, and cash is Transfer & Pay's subject; a
 * dividend or split still ahead changes what an open position *is* — a split
 * rewrites a strike overnight, and a dividend before expiry is what makes an
 * early assignment on a short call rational. This page is the second question.
 *
 * Measured on DEV 2026-09-17: the feed carried deep history (back to 1980 on
 * one name) and not one row dated ahead of today on the 28 symbols checked.
 * Re-measured 2026-09-26 on the 26 names the book and watchlist touch: 321
 * rows, one of them dated ahead (a dividend 34 days out, past the 30-day
 * window) — the nightly −7 / +60 day pull does bring declared events in, as
 * soon as an issuer declares. So nothing on this page may assert that no name
 * has declared one: the counts decide, and an event declared beyond the window
 * is listed rather than dropped. An empty calendar still says "nothing declared
 * yet", never "nothing is coming".
 */
import type { BookEvent, FeedRow } from '@/utils/corporateActionEvents'

// Moved to the shared layer when the Calendar became their second reader (§14.2).
export { buildBookEvents, type BookEvent, type CorporateActionKind, type FeedRow } from '@/utils/corporateActionEvents'

/** One open leg, as the contract stands before any event. */
export interface OpenLeg {
  contractKey: string
  /** The §14.4 contract token, built by the caller. */
  label: string
  symbol: string
  expiry: string
  strike: number
  right: string
  qty: number
}

/**
 * Legs of one kind on one name, as the design's table rows them.
 *
 * The design does not list contracts one per line: it says "Short calls" and
 * gives the count, because an event acts on the role, not on each ticket. A
 * role that is one contract carries its token; a role spread over strikes says
 * how many.
 */
export interface LegRole {
  role: string
  /** Contracts, as a positive count. */
  contracts: number
  /** Set when the role is a single contract — then the token is the reading. */
  label: string | null
  distinct: number
  nearestExpiry: string | null
}

/**
 * One name, with everything an event would land on: the option roles, the
 * shares, and how many of those shares are already standing behind a call.
 *
 * `backing` and `spare` are Backing & Model's own reading, passed in rather
 * than recomputed — the coverage sentence the design prints ("3,200 of 5,200
 * shares back the calls") has to be the same number that page shows.
 */
export interface UnderlyingSlice {
  symbol: string
  roles: LegRole[]
  shares: number
  backing: number | null
  spare: number | null
  /** The event dated ahead that would reshape this name, when there is one. */
  event: BookEvent | null
}

function roleOf(leg: OpenLeg): string {
  const side = leg.qty < 0 ? 'Short' : 'Long'
  const kind = leg.right === 'C' ? 'calls' : leg.right === 'P' ? 'puts' : 'legs'
  return `${side} ${kind}`
}

/**
 * The book sliced the way an event reads it: one row per name, roles inside.
 *
 * Names with a leg come first and are ordered by the nearest expiry, because a
 * leg that dies sooner is the one an event has less room to be answered in.
 */
export function sliceByUnderlying(input: {
  legs: readonly OpenLeg[]
  sharesBySymbol: ReadonlyMap<string, number>
  coverBySymbol: ReadonlyMap<string, { backing: number; spare: number }>
  eventBySymbol: ReadonlyMap<string, BookEvent>
}): UnderlyingSlice[] {
  const bySymbol = new Map<string, OpenLeg[]>()
  for (const l of input.legs) {
    bySymbol.set(l.symbol, [...(bySymbol.get(l.symbol) ?? []), l])
  }
  const out: UnderlyingSlice[] = []
  for (const [symbol, legs] of bySymbol) {
    const byRole = new Map<string, OpenLeg[]>()
    for (const l of legs) byRole.set(roleOf(l), [...(byRole.get(roleOf(l)) ?? []), l])
    const cover = input.coverBySymbol.get(symbol) ?? null
    out.push({
      symbol,
      roles: [...byRole.entries()]
        .map(([role, list]) => ({
          role,
          contracts: list.reduce((n, l) => n + Math.abs(l.qty), 0),
          label: list.length === 1 ? list[0].label : null,
          distinct: list.length,
          nearestExpiry: list.reduce<string | null>(
            (a, l) => (a == null || l.expiry < a ? l.expiry : a),
            null,
          ),
        }))
        .sort((a, b) => a.role.localeCompare(b.role)),
      shares: input.sharesBySymbol.get(symbol) ?? 0,
      backing: cover?.backing ?? null,
      spare: cover?.spare ?? null,
      event: input.eventBySymbol.get(symbol) ?? null,
    })
  }
  return out.sort((a, b) => {
    const ea = a.roles.reduce<string | null>((x, r) => (x == null || (r.nearestExpiry ?? '') < x ? r.nearestExpiry : x), null)
    const eb = b.roles.reduce<string | null>((x, r) => (x == null || (r.nearestExpiry ?? '') < x ? r.nearestExpiry : x), null)
    return (ea ?? '').localeCompare(eb ?? '') || a.symbol.localeCompare(b.symbol)
  })
}

export const CALENDAR_DAYS = 30
export const HISTORY_DAYS = 90

export const CORPORATE_ACTIONS_UNRECORDED = {
  forward:
    'The feed does reach ahead: the plugin pulls the whole market every night over a −7 / +60 day window, and names whose issuers declare early come back with an ex-date in the future. A dividend exists only once it is declared — a monthly ETF declares a day or two before its ex-date, a quarterly payer two to four weeks. An empty Next 30 days therefore reads as “nothing is coming”, and means “nothing has been declared yet”.',
  contract:
    'A split rewrites a strike and a multiplier overnight, and the ticker does not change, so a leg can be a different contract on the same name the next morning. Only a declared split can be shown here, so a leg with nothing against it means none declared, not none coming. A merger or a spin-off would reshape one too, and neither is a thing this feed reports at all: the vendor sells dividends and splits, and what an event turns a contract into is the broker’s record, not the market’s.',
  assignment:
    'The extrinsic-versus-dividend test lives on Assignment. This panel reads it without recomputing; Assignment is the source. The test needs a dividend declared before the leg’s expiry — a leg with none against it has nothing to weigh yet.',
  cash: 'A dividend already booked as cash is on Transfer & Pay. What is here is the event, not the payment — and the amount against the book is computed on today’s share count, not the count on the ex-date.',
  watchlist:
    'The calendar covers the watchlist as well as the book, because a split distorts a name\u2019s chain and its backtest whether or not the book holds it. Held or watched, the rows are drawn from the same feed \u2014 which will carry an ex-date for either as soon as its issuer declares one.',
} as const

/**
 * A strike after a split, read `from : to` — a 1 : 10 forward split takes a
 * $1,200 strike to $120.
 */
export function splitAdjustedStrike(strike: number, from: number | null, to: number | null): number | null {
  if (!Number.isFinite(strike) || from == null || to == null || from <= 0 || to <= 0) return null
  return (strike * from) / to
}

/** Contracts after a split — the other way round from the strike. */
export function splitAdjustedQty(qty: number, from: number | null, to: number | null): number | null {
  if (!Number.isFinite(qty) || from == null || to == null || from <= 0 || to <= 0) return null
  return (qty * to) / from
}

/** Events dated ahead of today, inside the calendar window. */
export function upcoming(events: readonly BookEvent[], days: number = CALENDAR_DAYS): BookEvent[] {
  return events
    .filter((e) => e.daysAway != null && e.daysAway > 0 && e.daysAway <= days)
    .sort((a, b) => (a.exDate ?? '').localeCompare(b.exDate ?? ''))
}

/**
 * Events declared past the calendar window — a declared ex-date 34 days out
 * is still the feed reaching ahead, and it is listed rather than dropped.
 */
export function declaredBeyond(events: readonly BookEvent[], days: number = CALENDAR_DAYS): BookEvent[] {
  return events
    .filter((e) => e.daysAway != null && e.daysAway > days)
    .sort((a, b) => (a.exDate ?? '').localeCompare(b.exDate ?? ''))
}

/**
 * The nearest dividend declared on a name with an ex-date after today and on
 * or before a leg's expiry — what the early-exercise test would weigh the
 * leg's extrinsic against. Null when none is declared.
 */
export function dividendBefore(
  events: readonly BookEvent[],
  symbol: string,
  expiry: string,
): BookEvent | null {
  const sym = symbol.trim().toUpperCase()
  const exp = expiry.slice(0, 10)
  return (
    events
      .filter(
        (e) =>
          e.kind === 'dividend' &&
          e.symbol === sym &&
          e.daysAway != null &&
          e.daysAway > 0 &&
          e.exDate != null &&
          e.exDate <= exp,
      )
      .sort((a, b) => (a.exDate ?? '').localeCompare(b.exDate ?? ''))[0] ?? null
  )
}

/** Events dated today or before it, inside the history window. */
export function recentHistory(events: readonly BookEvent[], days: number = HISTORY_DAYS): BookEvent[] {
  return events.filter((e) => e.daysAway != null && e.daysAway <= 0 && e.daysAway >= -days)
}

export interface FeedReach {
  /** Symbols asked for. */
  asked: number
  /** Symbols the feed answered with at least one event on record. */
  covered: number
  /**
   * Symbols the vendor answered with no event on record — a complete answer
   * (measured after the 09-29 backfill: a name that pays no dividend and has
   * never split carries none), not a gap. A read that failed is not here; the
   * page leaves it out of every count (`feedUnread`).
   */
  noneOnRecord: string[]
  rows: number
  oldest: string | null
  newest: string | null
  /** Rows dated ahead of today. The whole forward half of the page turns on it. */
  ahead: number
  /**
   * Names with exactly one event on record — the vendor's whole answer for
   * the name (a single split, say, on a name that pays nothing), not a thin
   * backfill. Named so a table row that stands alone reads as all there is.
   */
  oneOnRecord: string[]
}

export function feedReach(input: {
  bySymbol: ReadonlyMap<string, readonly FeedRow[]>
  today: string
}): FeedReach {
  let rows = 0
  let ahead = 0
  let oldest: string | null = null
  let newest: string | null = null
  const noneOnRecord: string[] = []
  const oneOnRecord: string[] = []
  for (const [symbol, list] of input.bySymbol) {
    if (list.length === 0) {
      noneOnRecord.push(symbol)
      continue
    }
    if (list.length === 1) oneOnRecord.push(symbol)
    rows += list.length
    for (const r of list) {
      const ex = r.ex_date ? r.ex_date.slice(0, 10) : null
      if (!ex) continue
      if (ex > input.today) ahead += 1
      if (oldest == null || ex < oldest) oldest = ex
      if (newest == null || ex > newest) newest = ex
    }
  }
  return {
    asked: input.bySymbol.size,
    covered: input.bySymbol.size - noneOnRecord.length,
    noneOnRecord: noneOnRecord.sort(),
    rows,
    oldest,
    newest,
    ahead,
    oneOnRecord: oneOnRecord.sort(),
  }
}

/**
 * The page narrowed to the top bar's symbol (`?symbol=`, Owner plan #21) —
 * every list about names, not the feed's reach, which is a fact about the
 * feed. No symbol, no narrowing.
 */
export function narrowToSymbol<T extends { symbol: string }>(list: readonly T[], symbol: string): T[] {
  return symbol ? list.filter((x) => x.symbol === symbol) : [...list]
}
