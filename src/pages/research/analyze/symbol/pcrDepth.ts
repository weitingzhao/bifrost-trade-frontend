/**
 * Which put/call readings stand on a real book. Research's PCR store was
 * computed off chains of a handful of contracts before August 2026 (PLTR's
 * July OI totals: a median of 546 contracts, against 3.66M in August), so it
 * prints 48.00 and 0.00. A ratio whose put + call totals are under
 * ``THIN_SHARE`` of the window's 90th-percentile depth is not a put/call ratio.
 */
import type { PcrRow } from '@/api/research/pcr'

export type PcrKey = 'pcr_volume' | 'pcr_oi'

export const THIN_SHARE = 0.02

const depthOf = (r: PcrRow, k: PcrKey) =>
  k === 'pcr_volume'
    ? (r.total_put_volume ?? 0) + (r.total_call_volume ?? 0)
    : (r.total_put_oi ?? 0) + (r.total_call_oi ?? 0)

/** The rows whose ratio stands on a real book, and how many were too thin. */
export function deepEnough(rows: PcrRow[], k: PcrKey): { kept: PcrRow[]; thin: number } {
  const withValue = rows.filter((r) => r[k] != null)
  const depths = withValue.map((r) => depthOf(r, k)).sort((a, b) => a - b)
  const p90 = depths.length > 0 ? depths[Math.floor(0.9 * (depths.length - 1))] : 0
  const kept = withValue.filter((r) => depthOf(r, k) >= THIN_SHARE * p90)
  return { kept, thin: withValue.length - kept.length }
}
