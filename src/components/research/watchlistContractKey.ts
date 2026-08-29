/**
 * Watchlist contract-key helpers — Wave 13.
 *
 * Trade stock watchlist keys use ``STK:{SYMBOL}`` (see normalizeToContractKey).
 */
export function stockWatchlistContractKey(symbol: string): string {
  const sym = (symbol || '').trim().toUpperCase()
  return sym ? `STK:${sym}` : ''
}

export function withWatchlistContractKey(
  originRef: Record<string, unknown> | null | undefined,
  symbol: string,
): Record<string, unknown> {
  const base = originRef && typeof originRef === 'object' ? { ...originRef } : {}
  const key = stockWatchlistContractKey(symbol)
  if (key) base.watchlist_contract_key = key
  return base
}
