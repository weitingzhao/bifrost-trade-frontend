/**
 * IV rank at entry — one of the design's seven, and one this page had marked
 * as unreadable ("the underlying's implied-volatility rank on the entry date
 * … neither reaches this side").
 *
 * Measured 2026-09-26 on DEV, it does reach: Research's
 * `/analytics/options/iv-percentile?symbol=&lookback_days=365` returns a row
 * per session with `iv_rank_1y` (the day's IV30 against its own trailing
 * year), rebuilt after the IV-history repair of 2026-09-25. Of the book's 16
 * option underlyings, 14 carry more than 200 sessions of IV30 before their
 * first fill. What still does not exist is the *floor* the design holds the
 * reading against — no rule on this side states one — so the strip draws no
 * reference line and the reading says so.
 *
 * The store answers the trailing year only, so a trade opened more than a year
 * ago drops out of the sample rather than being guessed; the reading names
 * how many it covers.
 *
 * Read by this page alone for now. The shared `habitReadings` still carries
 * the stub, and the Decision Inbox's IV-floor card reads that stub — moving
 * this into `utils/reviewHabits.ts` is what would make the two agree (§14.2).
 */
import type { IvPercentileRow } from '@/types/ivRadar'
import { meanBand, type HabitReading } from '@/utils/reviewHabits'
import type { ReviewTrade } from '@/utils/reviewTrades'

/** How far back from the entry date a row may sit and still be that session's rank. */
const MAX_STALE_DAYS = 5

function daysBefore(later: string, earlier: string): number {
  return Math.round((Date.parse(`${later}T00:00:00Z`) - Date.parse(`${earlier}T00:00:00Z`)) / 86_400_000)
}

/** The rank on the entry session, or the last one before it within a few days. */
export function rankOnEntry(rows: readonly IvPercentileRow[], openedOn: string): number | null {
  let best: IvPercentileRow | null = null
  for (const r of rows) {
    const d = (r.trade_date ?? '').slice(0, 10)
    if (!d || d > openedOn || r.iv_rank_1y == null) continue
    if (best == null || d > (best.trade_date ?? '')) best = r
  }
  if (best == null) return null
  const gap = daysBefore(openedOn, (best.trade_date ?? '').slice(0, 10))
  return gap <= MAX_STALE_DAYS ? best.iv_rank_1y : null
}

export function entryIvRankReading(
  trades: readonly ReviewTrade[],
  rowsByName: ReadonlyMap<string, readonly IvPercentileRow[] | null | undefined>,
  measuring: boolean,
): HabitReading {
  const ranked: { trade: ReviewTrade; rank: number }[] = []
  for (const trade of trades) {
    if (!trade.openedOn) continue
    const rows = rowsByName.get(trade.underlying)
    if (!rows) continue
    const rank = rankOnEntry(rows, trade.openedOn)
    if (rank != null) ranked.push({ trade, rank })
  }
  // A reading taken while names are still arriving would print a number that
  // changes on its own; it waits, the way the path habits do.
  if (measuring) ranked.length = 0
  const values = ranked.map((r) => r.rank)
  const avg = values.length === 0 ? null : values.reduce((a, b) => a + b, 0) / values.length
  const low = values.filter((v) => v < 30).length
  const high = values.filter((v) => v >= 50).length
  return {
    key: 'ivr_entry',
    label: 'IV rank at entry',
    unit: 'IV rank, of its own year',
    value: avg,
    n: values.length,
    stat: 'mean',
    ci: meanBand(values),
    ciLabel: '95%',
    read:
      avg == null
        ? 'No closed trade opened inside the trailing year the IV-rank store answers for.'
        : `Opened at an IV rank of ${avg.toFixed(0)} on average across ${values.length} of ${trades.length} closed trades; ${high} at 50 or over, ${low} under 30.`,
    consequence: null,
    consequenceLabel: 'what a low-rank entry cost needs the plan it would have broken',
    dots: ranked.map(({ trade, rank }) => ({ key: trade.contractKey, value: rank, realised: trade.realised })),
    reference: null,
    unmeasured:
      'the floor it is held against — no rule on this side states one, so the strip has no line to be above or below',
    kind: 'count',
    measuring,
  }
}
