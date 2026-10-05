/**
 * The names the book touches and the names you watch — the set the Events
 * Book face and the Calendar ask about (earnings, corporate actions).
 *
 * Book = every symbol with an open position in the monitor's snapshot, shares
 * and option legs alike (an option's `symbol` is its underlying there); a
 * name held only through a leg still has a print that moves it. Watch = the
 * watchlist's names that the book does not hold, so the two lanes never draw a
 * name twice.
 */
import { useMemo } from 'react'
import type { IbAccountSnapshot } from '@/types/monitor'
import { useMonitorStatus } from './useMonitorStatus'
import { useWatchlist } from './useWatchlist'

export interface BookWatchNames {
  /** Held, sorted. */
  book: string[]
  /** Watched and not held, sorted. */
  watch: string[]
  /** Both, sorted. */
  all: string[]
}

export function bookWatchNames(
  accounts: readonly Pick<IbAccountSnapshot, 'positions'>[],
  watchlist: readonly { symbol?: string | null }[],
): BookWatchNames {
  const book = new Set<string>()
  for (const a of accounts)
    for (const p of a.positions ?? []) {
      const sym = (p.symbol ?? '').trim().toUpperCase()
      if (sym && Number(p.position ?? 0) !== 0) book.add(sym)
    }
  const watch = new Set<string>()
  for (const w of watchlist) {
    const sym = (w.symbol ?? '').trim().toUpperCase()
    if (sym && !book.has(sym)) watch.add(sym)
  }
  return { book: [...book].sort(), watch: [...watch].sort(), all: [...new Set([...book, ...watch])].sort() }
}

export function useBookWatchNames() {
  const status = useMonitorStatus()
  const watchQ = useWatchlist()
  const accounts = status.data?.portfolio?.accounts
  const items = watchQ.data?.items
  const names = useMemo(() => bookWatchNames(accounts ?? [], items ?? []), [accounts, items])
  return {
    ...names,
    /** The book is the critical half; the watchlist only widens the ask. */
    bookLoading: status.isLoading,
    bookFailed: status.isError && !status.data,
    watchFailed: watchQ.isError && !watchQ.data,
  }
}
