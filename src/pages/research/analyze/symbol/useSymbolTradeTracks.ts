/**
 * The trades on one name, as the price chart draws them — read once for the
 * 440 face's trade list and for the phone's in-hand bar (design Rev .163),
 * so the two cannot count a different set of open trades.
 *
 * The book is the performance-book executions read (the same cached query the
 * chart makes); a leg's mark is the monitor's, so an open leg the monitor has
 * no quote for carries no P&L rather than an invented one.
 */
import { useMemo } from 'react'
import { tradeTracksFor, type TradeTrack } from '@/components/symbolChart/symbolPriceModel'
import { useLedgerExecutionsBook } from '@/hooks/useLedgerExecutions'
import { useSymbolLegs } from '@/hooks/useSymbolLegs'

export function useSymbolTradeTracks(symbol: string): { tracks: TradeTrack[]; loading: boolean } {
  const sym = symbol.trim().toUpperCase()
  const bookQ = useLedgerExecutionsBook({ limit: 0 })
  const legs = useSymbolLegs(sym)
  const tracks = useMemo(
    () => tradeTracksFor(bookQ.data?.items ?? [], sym, legs).filter((t) => t.id != null),
    [bookQ.data, sym, legs],
  )
  return { tracks, loading: bookQ.isLoading }
}

export interface OpenOnName {
  /** The trades with a leg still open, in the order the book opened them. */
  open: TradeTrack[]
  /** Open legs across those trades. */
  legs: number
  /** Open legs the monitor has a mark for. */
  marked: number
  /** The marks' sum; null when no open leg is marked. */
  unrealized: number | null
}

/** What the phone's in-hand bar reads: the open trades, and the unrealized on their open legs only. */
export function openOnName(tracks: readonly TradeTrack[]): OpenOnName {
  const open = tracks.filter((t) => t.closeDate == null)
  const legs = open.flatMap((t) => t.legs.filter((l) => l.flatDate == null))
  const marks = legs.filter((l) => l.pnlIsMark && l.pnl != null).map((l) => l.pnl as number)
  return {
    open,
    legs: legs.length,
    marked: marks.length,
    unrealized: marks.length > 0 ? marks.reduce((a, v) => a + v, 0) : null,
  }
}
