/**
 * One answer to "what is the underlying worth right now" for every figure on
 * the Positions and Backing pages — the cushion column, the expiry rows, the
 * cockpit's Risk line, the short-leg map, and the market values the rings and
 * the holdings tables are drawn from.
 *
 * Three sources, by freshness, each carried with its provenance:
 *
 *   live   the quote feed's `last` — present only while the market trades
 *   close  the latest daily bar in the warehouse, dated
 *   mark   the broker's price on the position row — only when its own stamp
 *          is newer than the close, because on DEV it has read March for
 *          six months while the row's `updated_at` moved every hour
 *
 * A symbol with none of these stays unknown: a strike, an average cost or a
 * guess is not a price. Nothing built on a close or a mark can pass as live —
 * the source and its time travel with the number. (Owner rule: an EOD value
 * is fine when its date is written where the number is.)
 */
import type { QuoteItem } from '@/types/market'
import type { IbPositionRow } from '@/types/monitor'
import type { AttributionMarkSource, LivePositionRow, PositionTradeAttribution } from '@/types/positions'

export type SpotSource = 'live' | 'close' | 'mark'

export interface Spot {
  price: number
  source: SpotSource
  /** Unix seconds: the quote's cache write, the bar's session date, or the mark's price update. */
  asOf: number | null
}

/** The latest daily bar for a symbol, as the page fetches it. */
export interface LatestBar {
  close: number
  prevClose: number | null
  /** Unix seconds of the bar's session. */
  date: number
}

export type SpotResolver = (symbol: string) => Spot | null

function finitePositive(v: unknown): v is number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) && n > 0
}

export function buildSpotResolver(
  quotesBySymbol: Record<string, QuoteItem>,
  stocks: readonly LivePositionRow[],
  barsBySymbol: Readonly<Record<string, LatestBar>> = {},
): SpotResolver {
  const marks = new Map<string, Spot>()
  for (const row of stocks) {
    const sym = (row.symbol ?? '').toUpperCase()
    if (!sym || (row.secType ?? '').toUpperCase() === 'OPT' || !finitePositive(row.price)) continue
    const asOf = row.price_updated_at ?? null
    const cur = marks.get(sym)
    // Two accounts hold the same stock at the same mark; keep the fresher stamp.
    if (!cur || (asOf ?? 0) > (cur.asOf ?? 0)) marks.set(sym, { price: Number(row.price), source: 'mark', asOf })
  }
  const cache = new Map<string, Spot | null>()
  return (symbol: string) => {
    const sym = (symbol ?? '').toUpperCase()
    if (cache.has(sym)) return cache.get(sym) ?? null
    const q = quotesBySymbol[sym]
    const bar = barsBySymbol[sym]
    const mark = marks.get(sym) ?? null
    let spot: Spot | null = null
    if (finitePositive(q?.last)) {
      spot = { price: Number(q!.last), source: 'live', asOf: q?.ts ?? null }
    } else if (bar && finitePositive(bar.close)) {
      // A mark stamped after the close is an intraday price the bar has not
      // caught up with; one stamped before it is older than the close.
      const close: Spot = { price: bar.close, source: 'close', asOf: bar.date }
      spot = mark ? preferFresherCloseOrMark(close, mark) : close
    } else if (mark) {
      spot = mark
    }
    cache.set(sym, spot)
    return spot
  }
}

/** How a set of symbols was priced — the honest caption for any figure built on them. */
export interface SpotMix {
  live: number
  close: number
  mark: number
  none: number
  /** The oldest close and the oldest mark used, so the caption can say how old. */
  oldestCloseAsOf: number | null
  oldestMarkAsOf: number | null
}

export function spotMixOf(symbols: readonly string[], resolve: SpotResolver): SpotMix {
  const mix: SpotMix = { live: 0, close: 0, mark: 0, none: 0, oldestCloseAsOf: null, oldestMarkAsOf: null }
  for (const s of symbols) {
    const spot = resolve(s)
    if (!spot) {
      mix.none += 1
      continue
    }
    mix[spot.source] += 1
    if (spot.source === 'close' && spot.asOf != null && (mix.oldestCloseAsOf == null || spot.asOf < mix.oldestCloseAsOf)) {
      mix.oldestCloseAsOf = spot.asOf
    }
    if (spot.source === 'mark' && spot.asOf != null && (mix.oldestMarkAsOf == null || spot.asOf < mix.oldestMarkAsOf)) {
      mix.oldestMarkAsOf = spot.asOf
    }
  }
  return mix
}

/**
 * "09-04" for a stamp. A close's stamp is a session date at midnight UTC — a
 * calendar day, read in UTC so a reader west of Greenwich does not see Friday's
 * close labelled Thursday. A live quote or a mark is an instant, read locally.
 */
/** Vendor session date (`YYYY-MM-DD`) as unix seconds at UTC midnight — same basis as a daily bar. */
export function sessionDateToUnix(day: string | null | undefined): number | null {
  const d = (day ?? '').slice(0, 10)
  if (d.length !== 10) return null
  const ms = Date.parse(`${d}T00:00:00.000Z`)
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : null
}

/**
 * When a dated close and a fresher mark both exist, the mark wins — the rule
 * `buildSpotResolver` uses for stocks and option legs share.
 */
export function preferFresherCloseOrMark(close: Spot, mark: Spot): Spot {
  return mark.asOf != null && close.asOf != null && mark.asOf > close.asOf ? mark : close
}

export function fmtSpotDate(asOf: number | null, source: SpotSource = 'mark'): string {
  if (asOf == null || !Number.isFinite(asOf)) return '—'
  const d = new Date(asOf * 1000)
  const [m, day] = source === 'close' ? [d.getUTCMonth(), d.getUTCDate()] : [d.getMonth(), d.getDate()]
  return `${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** "live" · "close 09-04" · "mark 03-16" — the words that follow a number priced this way. */
export function describeSpot(spot: Spot | null): string {
  if (!spot) return 'no quote'
  if (spot.source === 'live') return 'live'
  return `${spot.source} ${fmtSpotDate(spot.asOf, spot.source)}`
}

/**
 * The same rows with the resolved price written onto them, so every reader of
 * `row.price` — market value, cover valuation, the rings — prices the way the
 * risk side does. The bar's previous close replaces the row's own, since the
 * daily change must be measured against the close before the price in use.
 * `unrealized_pnl` is recomputed at that price: the row's own came from the
 * broker's mark (on DEV and PROD a March quote, TD-260), and beside a live mark
 * it printed a gain whose percentage said loss. No average cost, no figure.
 */
/**
 * Option leg mark on Positions: dated EOD attribution wins over a stale IB
 * `/status` price, and a fresher IB mark wins over an older EOD — the same
 * close-vs-mark rule stocks use in `buildSpotResolver`.
 */
export function resolveOptionLegMark(
  livePos: LivePositionRow | undefined,
  a: Pick<PositionTradeAttribution, 'price_mid' | 'price_last' | 'mark_source' | 'mark_date'>,
): {
  markPrice: number | null
  markSource: AttributionMarkSource | null | undefined
  markDate: string | null | undefined
} {
  const rowMark = finitePositive(a.price_mid) ? Number(a.price_mid) : finitePositive(a.price_last) ? Number(a.price_last) : null
  const ibPrice = finitePositive(livePos?.price) ? Number(livePos!.price) : null
  const ibAsOf = livePos?.price_updated_at ?? null

  if (a.mark_source === 'vendor_eod' && rowMark != null) {
    const eodAsOf = sessionDateToUnix(a.mark_date)
    if (eodAsOf != null) {
      const eodSpot: Spot = { price: rowMark, source: 'close', asOf: eodAsOf }
      if (ibPrice != null && ibAsOf != null) {
        const ibSpot: Spot = { price: ibPrice, source: 'mark', asOf: ibAsOf }
        const picked = preferFresherCloseOrMark(eodSpot, ibSpot)
        if (picked.source === 'mark') return { markPrice: ibPrice, markSource: undefined, markDate: undefined }
        return { markPrice: rowMark, markSource: a.mark_source, markDate: a.mark_date }
      }
      return { markPrice: rowMark, markSource: a.mark_source, markDate: a.mark_date }
    }
  }

  if (ibPrice != null) return { markPrice: ibPrice, markSource: undefined, markDate: undefined }
  if (rowMark == null) return { markPrice: null, markSource: undefined, markDate: undefined }
  return { markPrice: rowMark, markSource: a.mark_source, markDate: a.mark_date }
}

export function repriceRows(rows: readonly LivePositionRow[], resolve: SpotResolver, barsBySymbol: Readonly<Record<string, LatestBar>> = {}): LivePositionRow[] {
  return rows.map((row) => {
    if ((row.secType ?? '').toUpperCase() === 'OPT') return row
    const sym = (row.symbol ?? '').toUpperCase()
    const spot = resolve(sym)
    if (!spot) return row
    const bar = barsBySymbol[sym]
    const prev = spot.source === 'close' && bar?.prevClose != null ? bar.prevClose : undefined
    const qty = Number(row.position)
    const cost = row.avgCost != null ? Number(row.avgCost) : NaN
    const unrealized = Number.isFinite(qty) && Number.isFinite(cost) ? (spot.price - cost) * qty : null
    return {
      ...row,
      price: spot.price,
      price_updated_at: spot.asOf ?? row.price_updated_at ?? null,
      unrealized_pnl: unrealized,
      ...(prev != null ? { daily_prev_close: prev } : {}),
    }
  })
}

/**
 * Every account with its stock rows re-priced through one resolver built over
 * the whole book. For readers that take the status snapshot as accounts — the
 * category ring, fixed-income market value, the ledger's stock snapshot, Sizing
 * — which otherwise price at `row.price`: since core 0.60.0 the light /status
 * carries none (TD-260), and before that it carried March.
 */
export function repriceAccounts<A extends { account_id?: string; positions?: IbPositionRow[] }>(
  accounts: readonly A[],
  quotesBySymbol: Record<string, QuoteItem>,
  barsBySymbol: Readonly<Record<string, LatestBar>> = {},
): A[] {
  const rowsOf = (a: A): LivePositionRow[] => (a.positions ?? []).map((p) => ({ ...p, account_id: a.account_id ?? '' }))
  const resolve = buildSpotResolver(quotesBySymbol, accounts.flatMap(rowsOf), barsBySymbol)
  return accounts.map((a) => (a.positions ? { ...a, positions: repriceRows(rowsOf(a), resolve, barsBySymbol) } : a))
}
