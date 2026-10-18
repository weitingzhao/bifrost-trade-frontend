/**
 * The trades on one name, as the price chart draws them — read once for the
 * 440 face's trade list and for the compact page's in-hand bar (design Rev
 * .163), so the two cannot count a different set of open trades.
 *
 * The book is the performance-book executions read (the same cached query the
 * chart makes). The tracks' leg marks are the monitor's; the in-hand bar's
 * unrealized takes the trade page's chain instead (RESPONSE 2026-10-17:
 * live → the vendor's snapshot → the last EOD close, `useOpenLegMarks`), so
 * the bar and the trade it opens read the same figure.
 */
import { useMemo } from 'react'
import { tradeTracksFor, underlyingOf, type TradeTrack } from '@/components/symbolChart/symbolPriceModel'
import { useLedgerExecutionsBook } from '@/hooks/useLedgerExecutions'
import { useOpenLegMarks } from '@/hooks/useOpenLegMarks'
import { useSymbolLegs } from '@/hooks/useSymbolLegs'
import { legsOf, type LegMark, type RecordLeg } from '@/utils/tradeRecord/tradeRecordModel'

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

/** The trades with a leg still open, in the order the book opened them. */
export function openOnName(tracks: readonly TradeTrack[]): TradeTrack[] {
  return tracks.filter((t) => t.closeDate == null)
}

/**
 * The open trades' open legs on this name, each at the trade page's mark — a
 * trade at a time, so a contract one trade rolled out of and another holds
 * is two legs, as each trade page draws it.
 */
export function useHeldLegs(symbol: string, ids: readonly number[]): { legs: RecordLeg[]; pending: boolean } {
  const sym = symbol.trim().toUpperCase()
  const bookQ = useLedgerExecutionsBook({ limit: 0 })
  const idKey = ids.join(',')
  const byTrade = useMemo(() => {
    const items = bookQ.data?.items ?? []
    return idKey
      .split(',')
      .filter(Boolean)
      .map(Number)
      .map((id) => items.filter((e) => e.trade_id === id && (e.sec_type ?? '').toUpperCase() === 'OPT' && underlyingOf(e.symbol) === sym))
  }, [bookQ.data, idKey, sym])
  const bare = useMemo(() => byTrade.flatMap((execs) => legsOf(execs, {})), [byTrade])
  const { marks, pending } = useOpenLegMarks(bare)
  const legs = useMemo(() => byTrade.flatMap((execs) => legsOf(execs, marks)).filter((l) => l.open && l.openQty !== 0), [byTrade, marks])
  return { legs, pending: bookQ.isLoading || pending }
}

export interface HeldReading {
  /** Open legs across the open trades. */
  legs: number
  /** Open legs the chain found a mark for. */
  marked: number
  /** The marked legs' sum; null when no open leg is marked. */
  unrealized: number | null
  /** How many marks came from each source. */
  sources: Record<LegMark['source'], number>
}

/** What the compact page's in-hand bar reads: the unrealized on the open legs, marked legs only. */
export function heldReading(legs: readonly RecordLeg[]): HeldReading {
  const sources: HeldReading['sources'] = { live: 0, snap: 0, eod: 0 }
  let sum = 0
  let marked = 0
  for (const l of legs) {
    if (l.mark == null || l.pnl == null) continue
    marked += 1
    sum += l.pnl
    sources[l.mark.source] += 1
  }
  return { legs: legs.length, marked, unrealized: marked > 0 ? sum : null, sources }
}
