/**
 * Links into the Positions page — the ledger's way into the book. Accounts
 * shows what the broker reports; a symbol there opens that symbol's lines on
 * Positions with the same `?symbol=` scope the book pages share.
 */
export const POSITIONS_PATH = '/portfolio/positions'

export function positionsSymbolHref(symbol: string): string {
  const s = symbol.trim().toUpperCase()
  return s ? `${POSITIONS_PATH}?symbol=${encodeURIComponent(s)}` : POSITIONS_PATH
}
