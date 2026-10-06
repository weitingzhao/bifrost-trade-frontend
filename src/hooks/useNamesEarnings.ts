/**
 * The next print for a set of names — one Research read per name, keyed like
 * the Symbol page's (`useEarningsDates`) so a name already open there is not
 * asked again. See `utils/earningsReading.ts` for the source and the rule.
 *
 * Read by the Option screen, the Events Book face and the Calendar's Events
 * layer (§14.2: moved out of the screener when Events became its second
 * reader).
 */
import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { fetchEarningsDates } from '@/api/research/narrative'
import { readEarnings, type EarningsReading } from '@/utils/earningsReading'

function namesOf(symbols: readonly string[]): string[] {
  return [...new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))].sort()
}

function earningsQuery(sym: string, enabled = true) {
  return {
    queryKey: ['research-engine', 'narrative', 'earnings', sym],
    queryFn: () => fetchEarningsDates(sym),
    staleTime: 60 * 60_000,
    retry: false,
    enabled,
  }
}

/**
 * Name → reading; a name still loading is absent, not `none`. The map keeps
 * its identity while its content holds (an inline `combine` rebuilds it every
 * render), and a caller's memo must still list it as a dependency — leaving
 * it out froze the group rows at "earnings …" after every read had landed
 * (walk 2026-09-27).
 *
 * `ask` (default all) says which names may be asked: one request per name,
 * so a page over a whole universe asks only for the few it can afford and
 * still shows every name some other page already read (a disabled query
 * returns what the cache holds and never fetches).
 */
export function useNamesEarnings(
  symbols: readonly string[],
  ask: boolean | ((symbol: string) => boolean) = true,
): Record<string, EarningsReading> {
  const names = namesOf(symbols)
  const read = useQueries({
    queries: names.map((n) => earningsQuery(n, typeof ask === 'function' ? ask(n) : ask)),
    combine: (results) => {
      const out: Record<string, EarningsReading> = {}
      results.forEach((r, i) => {
        if (r.isPending) return
        if (r.isError) {
          const reason = `earnings read failed — ${(r.error as Error).message}`
          out[names[i]] = { kind: 'none', reason, absence: { code: 'unread', text: reason } }
        } else out[names[i]] = readEarnings(r.data)
      })
      return out
    },
  })
  const sig = Object.entries(read)
    .map(([sym, r]) => `${sym}:${r.kind === 'expected' ? `${r.next.date}:${r.next.daysAway}:${r.next.track.n}:${r.next.lastResult}` : `${r.absence.code}:${r.reason}`}`)
    .join(',')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => read, [sig])
}

/**
 * The results releases on file for a set of names — the 8-K dates the next
 * print is estimated from, oldest first (the Calendar's past prints, Rev .157).
 * The same reads as `useNamesEarnings`; a name still loading or failed is absent.
 */
export function useNamesResultDates(symbols: readonly string[]): Record<string, readonly string[]> {
  const names = namesOf(symbols)
  return useQueries({
    queries: names.map((n) => earningsQuery(n)),
    combine: (results) => {
      const out: Record<string, readonly string[]> = {}
      results.forEach((r, i) => {
        if (r.data) out[names[i]] = r.data.dates
      })
      return out
    },
  })
}
