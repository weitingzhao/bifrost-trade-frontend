/**
 * The candidate table's Option cell (design Rev 2026-09-22.8).
 *
 * `IVR 20 · VRP +3.4` — IV rank as the batch reports it, and VRP as signed vol
 * points, because the sign is the reading: premium dear or cheap. `vrp_20d`
 * arrives as a decimal (IV − RV20), so the cell multiplies by 100.
 *
 * VRP is not in the payload yet. Measured on DEV 2026-09-22 across 200 pending
 * drafts, no field anywhere is named for it — though the curator writes about
 * it in 191 of the rationales. **It is not parsed out of that prose**: prose is
 * an argument, not a data source (design's words). Until Research emits the
 * field the cell reads `IVR 20` alone — not `owed`, because on this kind the
 * reading has never been there, and the design's rule for that is to leave it
 * out. It appears on its own the day the field ships.
 *
 * `terrain_regime` and `total_net_gex` are deliberately not substituted:
 * regime is already what Rule that fits is judged on, and GEX is a dealer
 * reading rather than option pricing, so either would duplicate or misplace.
 */
import { readNum } from '@/lib/readUnknown'

export interface OptionCell {
  /** What the cell prints. */
  text: string
  /** The hover, carrying the percentile reading when it exists. */
  title: string | null
  /** False when the batch could not read options for this name at all. */
  ok: boolean
}

export interface OptionAnalytics {
  status?: unknown
  iv_rank_1y?: unknown
  vrp_20d?: unknown
  vrp_pct_252d?: unknown
}

export function optionCell(analytics: OptionAnalytics | null | undefined): OptionCell {
  // Kept for the day a batch cannot read a name — 13 of 13 are `ok` today, so
  // this branch is written against the future rather than the screen.
  if (!analytics || analytics.status !== 'ok') {
    return { text: 'no option data', title: 'The batch could not read options for this name.', ok: false }
  }

  const ivr = readNum(analytics.iv_rank_1y)
  const vrp = readNum(analytics.vrp_20d)
  const pct = readNum(analytics.vrp_pct_252d)

  const parts = [ivr == null ? 'IVR —' : `IVR ${Math.round(ivr)}`]
  if (vrp != null) {
    const points = vrp * 100
    parts.push(`VRP ${points >= 0 ? '+' : '−'}${Math.abs(points).toFixed(1)}`)
  }

  return {
    text: parts.join(' · '),
    title:
      pct != null
        ? `VRP percentile over 252 days: ${pct.toFixed(0)}`
        : vrp == null
          ? 'VRP is not in the batch payload yet — Research emits it as option_analytics.vrp_20d.'
          : null,
    ok: true,
  }
}
