/**
 * TD-19: 'trade' is the Trade entity. Core 0.38.0 named the counts it used to call
 * trades -- `fill_count` (fills) and `total_trades` (trades) -- and core 0.42.0 dropped
 * the old `trade_count` / `total_instances` (naming R0, D9). A row without the count
 * reads 0.
 */

export function fillCountOf(row: { fill_count?: number | null } | null | undefined): number {
  return row?.fill_count ?? 0
}

export function tradeTotalOf(row: { total_trades?: number | null }): number {
  return row.total_trades ?? 0
}
