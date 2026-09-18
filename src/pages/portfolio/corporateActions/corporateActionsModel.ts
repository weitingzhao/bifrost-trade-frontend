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
  symbol: string
  expiry: string
  strike: number
  right: string
  qty: number
  multiplier: number
}

export const CALENDAR_DAYS = 30
export const HISTORY_DAYS = 90

export const CORPORATE_ACTIONS_UNRECORDED = {
  forward:
    'Nothing in the feed is dated ahead of today. Every row it holds — for this book and for the largest payers checked beside it — is an event that already happened, so what is stored is a backfill rather than a calendar. An empty Next 30 days would read as “nothing is coming”; it means “nothing is known”.',
  contract:
    'A split rewrites a strike and a multiplier overnight, and the ticker does not change, so a leg can be a different contract on the same name the next morning. With no dated event ahead, nothing here can say a leg will be reshaped — or that it will not.',
  assignment:
    'The extrinsic-versus-dividend test lives on Assignment. This panel reads it rather than recomputing it: if the two ever disagree, this page is wrong first. The test needs a dividend dated before the leg’s expiry, and the feed has none.',
  cash: 'A dividend already booked as cash is on Transfer & Pay. What is here is the event, not the payment — and the amount against the book is computed on today’s share count, not the count on the ex-date.',
  watchlist:
    'The design also watches names that are not held, because a split distorts a chain and a backtest whether or not the book holds it. Nothing here reads the watchlist yet; the calendar covers the book only.',
} as const

function kindOf(actionType: string): CorporateActionKind {
  const t = actionType.trim().toLowerCase()
  if (t.includes('split')) return 'split'
  if (t.includes('dividend') || t.includes('distribution')) return 'dividend'
  return 'other'
}

/** Whole days between two ISO dates, positive when `to` is later. */
export function daysBetween(fromIso: string, toIso: string): number | null {
  const a = Date.parse(`${fromIso.slice(0, 10)}T00:00:00Z`)
  const b = Date.parse(`${toIso.slice(0, 10)}T00:00:00Z`)
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null
  return Math.round((b - a) / 86_400_000)
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
