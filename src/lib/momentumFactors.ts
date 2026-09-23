/**
 * The nine named sub-factors behind a momentum score, and how to read one.
 *
 * The annotations were written once, as prose inside `MomentumRadarPage`'s
 * legend. Stock ratings is the second reader — the design moved the factors
 * there in Package 2026-09-23.2 — so they move here first rather than being
 * copied (§14.2). The prototype's own copy came from that same legend, which
 * is how three copies were one edit away.
 *
 * ## They are scores, not z-scores (measured on DEV 2026-09-23)
 *
 * The field names read like standardised values — `z_sdt`, `z_v`, `z_ofi` —
 * and the prototype colours them on ±1.5, which is what you would do to a
 * z-score. The engine does not return z-scores. Every one of the nine comes
 * back on **0–100, higher is better**, as a contribution to the composite:
 *
 * ```
 * z_sdt 55.1 – 85.1 · z_v 37.9 – 100 · accept_vwap 17.0 – 100
 * z_ofi 50.0 – 50.0 · h_52w 36.2 – 100 · o_plus 6.7 – 100
 * a_factor 54.6 – 100 · r_sec 0 – 100 · crash 0 – 100     (n = 200)
 * ```
 *
 * So `h_52w` is not a negative percentage below the high, and a `crash` of
 * 0.7 is not a tail-risk alarm — on this scale 0.7 would be the worst reading
 * in the sample rather than the loudest.
 *
 * ## `z_ofi` is pinned
 *
 * Its minimum, median and maximum are all exactly 50.0 across 200 rows: the
 * order-flow proxy is not computed and the engine substitutes the neutral
 * midpoint. A factor that never varies is not a reading, and a row that shows
 * it without saying so invites the reader to weigh it. It is marked instead of
 * dropped — the same gap Lens Coverage names, where `order_sentiment` screens
 * 0 of 647.
 */

export type MomentumFactorKey =
  | 'z_sdt'
  | 'z_v'
  | 'accept_vwap'
  | 'z_ofi'
  | 'h_52w'
  | 'o_plus'
  | 'a_factor'
  | 'r_sec'
  | 'crash'

export interface MomentumFactor {
  key: MomentumFactorKey
  /** The radar legend's own sentence, unchanged. */
  note: string
  /**
   * Why this factor cannot be read today, when it cannot. Measured, not
   * assumed — see the module doc.
   */
  pinned?: string
}

export const MOMENTUM_FACTORS: readonly MomentumFactor[] = [
  { key: 'z_sdt', note: 'Short-term trend deviation; high = extended up.' },
  { key: 'z_v', note: 'Volume z-score; spikes flag participation.' },
  { key: 'accept_vwap', note: 'Price vs session VWAP acceptance.' },
  {
    key: 'z_ofi',
    note: 'Order flow imbalance proxy.',
    pinned:
      'Not computed — the engine returns exactly 50.0 for every row, so this factor carries no information today.',
  },
  { key: 'h_52w', note: 'Distance from 52-week high.' },
  { key: 'o_plus', note: 'Opening range extension factor.' },
  { key: 'a_factor', note: 'Acceleration / momentum persistence.' },
  { key: 'r_sec', note: 'Sector relative strength.' },
  { key: 'crash', note: 'Tail-risk / crash sensitivity.' },
] as const

/**
 * The same cuts the composite uses (`stockRatingsModel.HOT_AT` / `COLD_AT`),
 * repeated here because a `lib/` module may not read a page's — pinned to
 * those constants by the test so the two cannot drift.
 */
export const FACTOR_HOT_AT = 70
export const FACTOR_COLD_AT = 35

export type FactorTone = 'strong' | 'weak' | 'plain' | 'unread'

/**
 * One factor's reading. `unread` is not `plain`: a pinned factor has no
 * reading at all, and colouring it neutral would say it was measured and came
 * out middling.
 */
export function momentumFactorTone(
  factor: MomentumFactor,
  value: number | null | undefined,
): FactorTone {
  if (factor.pinned) return 'unread'
  if (value == null || !Number.isFinite(value)) return 'unread'
  if (value >= FACTOR_HOT_AT) return 'strong'
  if (value <= FACTOR_COLD_AT) return 'weak'
  return 'plain'
}

/** `null` and a pinned factor both print `—`; a real 0 prints `0.0`. */
export function momentumFactorText(
  factor: MomentumFactor,
  value: number | null | undefined,
): string {
  if (factor.pinned) return '—'
  if (value == null || !Number.isFinite(value)) return '—'
  return value.toFixed(1)
}

export interface FactorReading {
  key: MomentumFactorKey
  note: string
  text: string
  tone: FactorTone
  /** Set when the factor cannot be read; goes in the row's `title`. */
  pinned?: string
}

/** The nine, in the legend's order, read against one row of factor values. */
export function momentumFactorReadings(
  values: Partial<Record<MomentumFactorKey, number | null>> | null | undefined,
): FactorReading[] {
  return MOMENTUM_FACTORS.map((f) => {
    const v = values?.[f.key] ?? null
    return {
      key: f.key,
      note: f.note,
      text: momentumFactorText(f, v),
      tone: momentumFactorTone(f, v),
      pinned: f.pinned,
    }
  })
}
