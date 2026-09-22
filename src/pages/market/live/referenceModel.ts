/**
 * The design's Reference panel — indices & vol, the five instruments an
 * options book keeps in the corner of its eye.
 *
 * `Market Live.dc.html` (Rev 2026-09-20.16) names them and says why: *"SPY ·
 * QQQ · IWM proxies, VIX for the vol regime, TLT for the rate leg."*
 *
 * ## Four of the five answer, and the fifth is not a bug
 *
 * Measured on DEV 2026-09-22: `GET /market/bars/benchmark` answers for SPY,
 * QQQ, IWM and TLT with `close` / `prev_close` / `is_today`. **VIX answers for
 * nothing** — not `VIX`, not `^VIX`, not `VIX.IND`, and `/market/quotes` has
 * no row for it either; the research engine carries no VIX series. The feed
 * subscribes to equities and ETFs, and VIX is an index.
 *
 * `VXX` *does* answer, and it is deliberately not substituted: VXX is an ETN
 * on VIX futures, and printing its number under the label VIX would be a
 * different quantity wearing the right name. The tile keeps its place and
 * says what is missing — the design's rule for every reading this book cannot
 * make.
 *
 * The change is computed through the same `resolveDailyBasePrice` /
 * `computeDailyChange` the Watchlist and the Home tape use, so the three
 * surfaces cannot disagree about what "today" means (§14.2).
 */
import type { DailyBenchmark, QuoteItem } from '@/types/market'
import { computeDailyChange, resolveDailyBasePrice } from '@/utils/dailyChange'

export interface ReferenceInstrument {
  symbol: string
  /** Why this one is on the panel, in the design's own words. */
  why: string
}

/** The design's five, in its own order. */
export const REFERENCE_INSTRUMENTS: readonly ReferenceInstrument[] = [
  { symbol: 'SPY', why: 'broad-market proxy · β is measured against it' },
  { symbol: 'QQQ', why: 'the growth half of the book' },
  { symbol: 'IWM', why: 'small-cap proxy' },
  { symbol: 'VIX', why: 'the vol regime' },
  { symbol: 'TLT', why: 'the rate leg' },
]

export interface ReferenceTile {
  symbol: string
  why: string
  last: number | null
  /**
   * Percent units, not a fraction — `computeDailyChange` returns 0.81 for a
   * 0.81% move, and the panel printed 80.8% for one day before a render
   * caught it.
   */
  changePct: number | null
  /** Set when this side cannot read the instrument at all, with the reason. */
  unavailable: string | null
  /** The quote is live rather than the settled close it falls back to. */
  live: boolean
}

const NO_VIX =
  'no VIX on this feed — the benchmark route answers for equities and ETFs, not for an index, and nothing else here carries the series. VXX is an ETN on VIX futures, which is a different quantity.'

/**
 * The design's five, plus anything the backend declares.
 *
 * `status.live_ui.reference_indices` is this app's existing configuration
 * point for exactly this panel — and it answers `[]` on DEV, which is why no
 * reference panel ever appeared here. The panel no longer waits for it: the
 * design's five are the default, and a declared index is added rather than
 * silently dropped.
 */
export function referenceTiles(
  benchmarks: Record<string, DailyBenchmark>,
  quotes: Record<string, QuoteItem>,
  declared: readonly string[] = [],
): ReferenceTile[] {
  const known = new Set(REFERENCE_INSTRUMENTS.map((r) => r.symbol))
  const extra: ReferenceInstrument[] = declared
    .map((s) => s.trim().toUpperCase())
    .filter((s) => s && !known.has(s))
    .map((symbol) => ({ symbol, why: 'declared by the monitor as a reference index' }))
  return [...REFERENCE_INSTRUMENTS, ...extra].map(({ symbol, why }) => {
    const bench = benchmarks[symbol]
    const quote = quotes[symbol]
    if (!bench && quote?.last == null) {
      return {
        symbol,
        why,
        last: null,
        changePct: null,
        unavailable: symbol === 'VIX' ? NO_VIX : 'no reading from the benchmark route or the quote cache',
        live: false,
      }
    }
    const base = resolveDailyBasePrice(null, bench)
    // The quote when the tape is running, the settled close when it is not —
    // a stale last shown as live is the thing this panel must not do.
    const last = quote?.last ?? bench?.close ?? null
    const { dailyPct } = computeDailyChange(last, base)
    return {
      symbol,
      why,
      last,
      changePct: dailyPct,
      unavailable: null,
      live: quote?.last != null,
    }
  })
}

/** How many of the design's five this book can actually read. */
export function referenceStanding(tiles: readonly ReferenceTile[]): string {
  const missing = tiles.filter((t) => t.unavailable != null).map((t) => t.symbol)
  if (missing.length === 0) return `${tiles.length} of ${tiles.length} reading`
  return `${tiles.length - missing.length} of ${tiles.length} reading · ${missing.join(', ')} unavailable`
}
