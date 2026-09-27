/**
 * Watchlist contract-key helpers — Wave 13.
 *
 * Trade stock watchlist keys use ``STK:{SYMBOL}`` (see normalizeToContractKey).
 */
export function stockWatchlistContractKey(symbol: string): string {
  const sym = (symbol || '').trim().toUpperCase()
  return sym ? `STK:${sym}` : ''
}
