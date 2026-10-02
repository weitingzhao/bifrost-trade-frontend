/**
 * Watchlist contract-key helpers — Wave 13.
 *
 * A stock's watchlist key is the canonical `SYMBOL|STK|||`, the key the store
 * keeps and every other surface (the Watchlist page's Add, positions) writes.
 * This used to build `STK:SYMBOL`; the store has no `|` in that to recognise,
 * so it filed it under `STK:SYMBOL|STK|||` — a second row beside the real one
 * (TD-15). Same output as `normalizeToContractKey` for a bare symbol.
 */
export function stockWatchlistContractKey(symbol: string): string {
  const sym = (symbol || '').trim().toUpperCase()
  return sym ? `${sym}|STK|||` : ''
}
