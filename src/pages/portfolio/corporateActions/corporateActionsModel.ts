/**
 * Events that reshape what the book holds, and what they do to a contract.
 *
 * Two different questions live here and they must not be blurred. A dividend
 * that has already been paid is cash, and cash is Transfer & Pay's subject; a
 * dividend or split still ahead changes what an open position *is* — a split
 * rewrites a strike overnight, and a dividend before expiry is what makes an
 * early assignment on a short call rational. This page is the second question.
 *
 * Measured on DEV 2026-09-17: the feed carries deep history (back to 1980 on
 * one name) and not one row dated ahead of today, on any of the 28 symbols
 * checked including the largest payers. So the forward half of this page has no
 * data — not because the vendor has none, but because what is stored is a
 * backfill of what happened. The page says that rather than drawing an empty
 * calendar, which would read as "nothing is coming".
 */
import { daysBetween } from '@/lib/isoDate'

export type CorporateActionKind = 'dividend' | 'split' | 'other'

export interface FeedRow {
  symbol: string
  action_type: string
  ex_date: string | null
  record_date: string | null
  payment_date: string | null
  ratio_from: number | null
  ratio_to: number | null
  amount: number | null
  currency?: string | null
  fetched_at?: string | null
}

export interface BookEvent {
  key: string
  symbol: string
  kind: CorporateActionKind
  /** yyyy-mm-dd, or null when the vendor did not date it. */
  exDate: string | null
  recordDate: string | null
  paymentDate: string | null
  /** Per share, on a dividend. */
  amount: number | null
  ratioFrom: number | null
  ratioTo: number | null
  /** Shares the book holds today — not what it held on the ex-date. */
  shares: number | null
  /**
   * `amount × shares`, on today's holding.
   *
   * Deliberately not called "received": the book's share count today is not
   * the count on the ex-date, and what actually landed is Transfer & Pay's
   * record. This is the size of the event against the book as it stands.
   */
  onTodaysHolding: number | null
  /** An open option leg on this name would be rewritten by it. */
  touchesAContract: boolean
  /** Days from today; negative is past. Null when the row carries no ex-date. */
  daysAway: number | null
}

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
    'The feed does reach ahead: the plugin pulls the whole market every night over a −7 / +60 day window, and names whose issuers declare early come back with an ex-date in the future. None of these names carries one today, because a dividend exists only once it is declared — a monthly ETF declares a day or two before its ex-date, a quarterly payer two to four weeks. An empty Next 30 days therefore reads as “nothing is coming”, and means “nothing has been declared yet”.',
  contract:
    'A split rewrites a strike and a multiplier overnight, and the ticker does not change, so a leg can be a different contract on the same name the next morning. With no split dated ahead on any of these names, nothing here can say a leg will be reshaped — or that it will not. A merger or a spin-off would reshape one too, and neither is a thing this feed reports at all: the vendor sells dividends and splits, and what an event turns a contract into is the broker’s record, not the market’s.',
  assignment:
    'The extrinsic-versus-dividend test lives on Assignment. This panel reads it rather than recomputing it: if the two ever disagree, this page is wrong first. The test needs a dividend dated before the leg’s expiry, and none of these names has declared one yet.',
  cash: 'A dividend already booked as cash is on Transfer & Pay. What is here is the event, not the payment — and the amount against the book is computed on today’s share count, not the count on the ex-date.',
  watchlist:
    'The calendar covers the watchlist as well as the book, because a split distorts a name\u2019s chain and its backtest whether or not the book holds it. Held or watched, the rows are drawn from the same feed \u2014 which will carry an ex-date for either as soon as its issuer declares one.',
} as const

function kindOf(actionType: string): CorporateActionKind {
  const t = actionType.trim().toLowerCase()
  if (t.includes('split')) return 'split'
  if (t.includes('dividend') || t.includes('distribution')) return 'dividend'
  return 'other'
}


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

export function buildBookEvents(input: {
  rows: readonly FeedRow[]
  sharesBySymbol: ReadonlyMap<string, number>
  /** Underlyings carrying an open option leg — those an event would reshape. */
  legSymbols: ReadonlySet<string>
  today: string
}): BookEvent[] {
  const out: BookEvent[] = []
  for (const r of input.rows) {
    const symbol = (r.symbol ?? '').trim().toUpperCase()
    if (!symbol) continue
    const exDate = r.ex_date ? r.ex_date.slice(0, 10) : null
    const shares = input.sharesBySymbol.get(symbol) ?? null
    const amount = r.amount ?? null
    out.push({
      key: `${symbol}|${r.action_type}|${exDate ?? '—'}|${amount ?? r.ratio_to ?? ''}`,
      symbol,
      kind: kindOf(r.action_type ?? ''),
      exDate,
      recordDate: r.record_date ? r.record_date.slice(0, 10) : null,
      paymentDate: r.payment_date ? r.payment_date.slice(0, 10) : null,
      amount,
      ratioFrom: r.ratio_from ?? null,
      ratioTo: r.ratio_to ?? null,
      shares,
      onTodaysHolding: amount == null || shares == null ? null : amount * shares,
      touchesAContract: input.legSymbols.has(symbol),
      daysAway: exDate ? daysBetween(input.today, exDate) : null,
    })
  }
  // Newest first: the reading is "what just happened", and the calendar sorts
  // the other way on its own.
  return out.sort((a, b) => (b.exDate ?? '').localeCompare(a.exDate ?? ''))
}

/** Events dated ahead of today, inside the calendar window. */
export function upcoming(events: readonly BookEvent[], days: number = CALENDAR_DAYS): BookEvent[] {
  return events
    .filter((e) => e.daysAway != null && e.daysAway > 0 && e.daysAway <= days)
    .sort((a, b) => (a.exDate ?? '').localeCompare(b.exDate ?? ''))
}

/** Events dated today or before it, inside the history window. */
export function recentHistory(events: readonly BookEvent[], days: number = HISTORY_DAYS): BookEvent[] {
  return events.filter((e) => e.daysAway != null && e.daysAway <= 0 && e.daysAway >= -days)
}

export interface FeedReach {
  /** Symbols asked for. */
  asked: number
  /** Symbols the feed answered with at least one row. */
  covered: number
  /** Symbols with nothing at all — the feed cannot say whether they pay. */
  silent: string[]
  rows: number
  oldest: string | null
  newest: string | null
  /** Rows dated ahead of today. The whole forward half of the page turns on it. */
  ahead: number
  /**
   * Names whose only row is a single one.
   *
   * A quarterly payer backfilled properly carries decades. A name carrying
   * exactly one row has been reached by the feed but not backfilled, which is a
   * different fault from silence and reads the same on a table unless it is
   * named.
   */
  shallow: string[]
}

export function feedReach(input: {
  bySymbol: ReadonlyMap<string, readonly FeedRow[]>
  today: string
}): FeedReach {
  let rows = 0
  let ahead = 0
  let oldest: string | null = null
  let newest: string | null = null
  const silent: string[] = []
  const shallow: string[] = []
  for (const [symbol, list] of input.bySymbol) {
    if (list.length === 0) {
      silent.push(symbol)
      continue
    }
    if (list.length === 1) shallow.push(symbol)
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
    covered: input.bySymbol.size - silent.length,
    silent: silent.sort(),
    rows,
    oldest,
    newest,
    ahead,
    shallow: shallow.sort(),
  }
}
