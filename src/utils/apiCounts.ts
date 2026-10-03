/**
 * TD-19: 'trade' is the strategy instance. Core 0.38.0 names the counts it used to
 * call trades: `fill_count` beside `trade_count` (fills), `total_trades` beside
 * `total_instances` (trades). Read the new key, fall back to the old one for an API
 * from before 0.38.0; drop the fallback when the old keys go.
 */

export function fillCountOf(row: { fill_count?: number | null; trade_count?: number | null } | null | undefined): number {
  return row?.fill_count ?? row?.trade_count ?? 0
}

export function tradeTotalOf(row: { total_trades?: number | null; total_instances?: number | null }): number {
  return row.total_trades ?? row.total_instances ?? 0
}
