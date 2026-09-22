/**
 * The Watchlist as The Book reads it — one row per watched name, assembled.
 *
 * `Research Watchlist.dc.html` is not a list of tickers: it is *"names with a
 * thesis attached"*, and its header note carries the rule that makes it one —
 * **a watch without a thesis expires in 10 sessions**. Every column exists to
 * answer one of two questions: is this name still doing something, and is
 * there still a reason it is here.
 *
 * Assembly is here rather than in the table so the join can be tested without
 * a DOM. Four stores meet in a row and none of them knows about the others:
 *
 * | column | store | measured on DEV 2026-09-22 |
 * |---|---|---|
 * | Symbol · Age | `/market/watchlist` | 22 names, all STK |
 * | Last | the quote stream | real |
 * | Day | `/market/bars/benchmark` (one call for every name) | real |
 * | IV rank | `/market/analytics/iv-percentile`, per symbol | 18 of 22 |
 * | Thesis | the hypothesis whose `symbols[]` names it | 5 of 22 |
 *
 * The four names with no IV rank are BALI, BINC, PFF and SGOV — every one of
 * them in the `Fix Income` category. That is not a hole in the data: a bond
 * ETF has no options chain to rank, so the cell says so rather than printing
 * a dash that reads like a failure.
 */
import type { DailyBenchmark, QuoteItem, WatchlistItem } from '@/types/market'
import type { Hypothesis } from '@/api/researchHypothesis'
import type { IvPercentileRow } from '@/types/ivRadar'
import { computeDailyChange, resolveDailyBasePrice } from '@/utils/dailyChange'
import { stuckAgeTone, thesisFor } from '@/lib/research/bookCensus'

/** The categories whose names have no options chain, so no IV rank to want. */
const NO_CHAIN_CATEGORIES = new Set(['Fix Income'])

export interface WatchBookRow {
  item: WatchlistItem
  symbol: string
  last: number | null
  /** Price return against the prior settled close, in percent. */
  dayPct: number | null
  ivRank: number | null
  /** Why there is no IV rank, when there is none. Null when there is one. */
  ivAbsence: string | null
  /** The belief this name is held on, or null — the design's Thesis column. */
  thesis: Hypothesis | null
  ageDays: number | null
  /** `old` past the design's eighth day, `aging` from the fourth. */
  ageTone: 'old' | 'aging' | 'plain'
}

/** Seconds since the epoch, as the store writes them (a string, sometimes). */
function addedAt(item: WatchlistItem): number | null {
  const raw = Number(item.created_at)
  return Number.isFinite(raw) && raw > 0 ? raw * 1000 : null
}

export function watchBookRows(
  items: readonly WatchlistItem[],
  quoteBySymbol: Readonly<Record<string, QuoteItem>>,
  benchmarks: Readonly<Record<string, DailyBenchmark>>,
  ivBySymbol: ReadonlyMap<string, IvPercentileRow | null>,
  hypotheses: readonly Hypothesis[],
  now: number,
): WatchBookRow[] {
  return items.map((item) => {
    const symbol = (item.symbol ?? '').trim().toUpperCase()
    const quote = quoteBySymbol[symbol]
    const last = quote?.last ?? quote?.mid ?? null
    // The shared reading, not a second one: the base is the prior settled
    // close, and `is_today` decides which of the benchmark's two it is.
    const base = resolveDailyBasePrice(null, benchmarks[symbol])
    const { dailyPct } = computeDailyChange(last, base, 1)
    const iv = ivBySymbol.get(symbol)?.iv_rank_1y ?? null
    const at = addedAt(item)
    const ageDays = at == null ? null : Math.floor((now - at) / 86_400_000)
    return {
      item,
      symbol,
      last,
      dayPct: dailyPct,
      ivRank: iv,
      ivAbsence:
        iv != null
          ? null
          : NO_CHAIN_CATEGORIES.has(item.category ?? '')
            ? 'no options chain — a fixed-income ETF has no IV to rank'
            : 'no IV percentile row for this name yet',
      thesis: thesisFor(hypotheses, symbol),
      ageDays,
      ageTone: stuckAgeTone(ageDays),
    }
  })
}

/**
 * The header's own reading: how much of this list still has a reason.
 *
 * The design prints the rule beside the count — *a watch without a thesis
 * expires in 10 sessions* — and the count is what makes the rule land or not.
 */
export function watchBookStanding(rows: readonly WatchBookRow[]): {
  names: number
  withThesis: number
  withoutThesis: number
  /** Names already past the design's aging mark; the whole list, when it is. */
  aging: number
} {
  const withThesis = rows.filter((r) => r.thesis != null).length
  return {
    names: rows.length,
    withThesis,
    withoutThesis: rows.length - withThesis,
    aging: rows.filter((r) => r.ageTone === 'old').length,
  }
}
