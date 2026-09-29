/**
 * IV rank at entry — where in its own year's volatility a trade was opened.
 *
 * Measured 2026-09-26 on DEV: Research's
 * `/analytics/options/iv-percentile?symbol=&lookback_days=365` returns a row
 * per session with `iv_rank_1y` (the day's IV30 against its own trailing
 * year), rebuilt after the IV-history repair of 2026-09-25. Of the book's 16
 * option underlyings, 14 carry more than 200 sessions of IV30 before their
 * first fill.
 *
 * Shared since 2026-09-26 (§14.2): Habits reads the reading, Trade review and
 * the Review panel read one trade's rank, and the Decision Inbox's IV-floor
 * card argues from the same reading — one lookup, so the four cannot
 * disagree. The reading itself lives with the other habits in
 * `reviewHabits.ts`; this module is the lookup it is built on.
 */
import type { IvPercentileRow } from '@/types/ivRadar'

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

/** The trailing year of IV rank for each name, and whether names are still arriving. */
export interface EntryIvRanks {
  /** Per underlying; `null` when that name's read failed (absent, not zero). */
  rowsByName: ReadonlyMap<string, readonly IvPercentileRow[] | null | undefined>
  loading: boolean
}
