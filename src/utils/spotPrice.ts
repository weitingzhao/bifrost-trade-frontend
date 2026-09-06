/**
 * One answer to "what is the underlying worth right now" for every risk
 * figure on the page — the cushion column, the expiry ladder, the cockpit's
 * Risk line, the short-leg map.
 *
 * Live quote first. Outside market hours the feed carries no `last` (bid and
 * ask read −1), and the page used to call every short leg unpriced while the
 * rings beside it valued the same stocks at the broker's mark. The mark is a
 * real price with a real time stamp — the snapshot says when it was updated —
 * so it is the second source, carried with its provenance so nothing built
 * on it can pass as live. A symbol with neither stays unknown: a strike, an
 * average cost or a guess is not a price. (Owner decision 2026-09-05.)
 */
import type { QuoteItem } from '@/types/market'
import type { LivePositionRow } from '@/types/positions'

export type SpotSource = 'live' | 'mark'

export interface Spot {
  price: number
  source: SpotSource
  /** Unix seconds; the quote's cache write for live, the price update for a mark. Null when unknown. */
  asOf: number | null
}

export type SpotResolver = (symbol: string) => Spot | null

function finitePositive(v: unknown): v is number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) && n > 0
}

export function buildSpotResolver(
  quotesBySymbol: Record<string, QuoteItem>,
  stocks: readonly LivePositionRow[],
): SpotResolver {
  const marks = new Map<string, Spot>()
  for (const row of stocks) {
    const sym = (row.symbol ?? '').toUpperCase()
    if (!sym || (row.secType ?? '').toUpperCase() === 'OPT' || !finitePositive(row.price)) continue
    const asOf = row.price_updated_at ?? row.updated_at ?? null
    const cur = marks.get(sym)
    // Two accounts hold the same stock at the same mark; keep the fresher stamp.
    if (!cur || (asOf ?? 0) > (cur.asOf ?? 0)) marks.set(sym, { price: Number(row.price), source: 'mark', asOf })
  }
  const cache = new Map<string, Spot | null>()
  return (symbol: string) => {
    const sym = (symbol ?? '').toUpperCase()
    if (cache.has(sym)) return cache.get(sym) ?? null
    const q = quotesBySymbol[sym]
    const spot: Spot | null = finitePositive(q?.last)
      ? { price: Number(q!.last), source: 'live', asOf: q?.ts ?? null }
      : (marks.get(sym) ?? null)
    cache.set(sym, spot)
    return spot
  }
}

/** How the short legs in scope are priced — the honest caption for any risk figure. */
export interface SpotMix {
  live: number
  mark: number
  none: number
  /** The oldest mark used, so "at broker mark" can say how old. */
  oldestMarkAsOf: number | null
}

export function spotMixOf(symbols: readonly string[], resolve: SpotResolver): SpotMix {
  const mix: SpotMix = { live: 0, mark: 0, none: 0, oldestMarkAsOf: null }
  for (const s of symbols) {
    const spot = resolve(s)
    if (!spot) mix.none += 1
    else if (spot.source === 'live') mix.live += 1
    else {
      mix.mark += 1
      if (spot.asOf != null && (mix.oldestMarkAsOf == null || spot.asOf < mix.oldestMarkAsOf)) mix.oldestMarkAsOf = spot.asOf
    }
  }
  return mix
}
