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
import type { LivePositionRow } from '@/types/positions'

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
      spot =
        mark && mark.asOf != null && mark.asOf > bar.date
          ? mark
          : { price: bar.close, source: 'close', asOf: bar.date }
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
 */
export function repriceRows(rows: readonly LivePositionRow[], resolve: SpotResolver, barsBySymbol: Readonly<Record<string, LatestBar>> = {}): LivePositionRow[] {
  return rows.map((row) => {
    if ((row.secType ?? '').toUpperCase() === 'OPT') return row
    const sym = (row.symbol ?? '').toUpperCase()
    const spot = resolve(sym)
    if (!spot) return row
    const bar = barsBySymbol[sym]
    const prev = spot.source === 'close' && bar?.prevClose != null ? bar.prevClose : undefined
    return {
      ...row,
      price: spot.price,
      price_updated_at: spot.asOf ?? row.price_updated_at ?? null,
      ...(prev != null ? { daily_prev_close: prev } : {}),
    }
  })
}
