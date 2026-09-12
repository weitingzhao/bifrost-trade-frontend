/**
 * Links into the Positions page — the ledger's way into the book. Accounts
 * shows what the broker reports; a symbol there opens that symbol's lines on
 * Positions with the same `?symbol=` scope the book pages share.
 */
import { withSymbolParam } from '@/lib/symbolLink'

export const POSITIONS_PATH = '/portfolio/positions'

export function positionsSymbolHref(symbol: string): string {
  return withSymbolParam(POSITIONS_PATH, symbol)
}
