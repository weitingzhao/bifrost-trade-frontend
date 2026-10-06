/**
 * The next print for a set of names — one Research read per name, keyed like
 * the Symbol page's (`useEarningsDates`) so a name already open there is not
 * asked again. See `utils/earningsReading.ts` for the source and the rule.
 *
 * Read by the Option screen, the Events Book face and the Calendar's Events
 * layer (§14.2: moved out of the screener when Events became its second
 * reader).
 */
import { useQueries } from '@tanstack/react-query'
import { fetchEarningsDates } from '@/api/research/narrative'
import { readEarnings, type EarningsReading } from '@/utils/earningsReading'

function namesOf(symbols: readonly string[]): string[] {
  return [...new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))].sort()
}

function earningsQuery(sym: string) {
  return {
    queryKey: ['research-engine', 'narrative', 'earnings', sym],
    queryFn: () => fetchEarningsDates(sym),
    staleTime: 60 * 60_000,
    retry: false,
  }
}

/**
 * Name → reading; a name still loading is absent, not `none`. The map is
 * rebuilt on every render (an inline `combine`), so a caller's memo must list
 * it as a dependency — leaving it out froze the group rows at "earnings …"
 * after every read had landed (walk 2026-09-27).
 */
export function useNamesEarnings(symbols: readonly string[]): Record<string, EarningsReading> {
  const names = namesOf(symbols)
  return useQueries({
    queries: names.map(earningsQuery),
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
}

/**
 * The results releases on file for a set of names — the 8-K dates the next
 * print is estimated from, oldest first (the Calendar's past prints, Rev .157).
 * The same reads as `useNamesEarnings`; a name still loading or failed is absent.
 */
export function useNamesResultDates(symbols: readonly string[]): Record<string, readonly string[]> {
  const names = namesOf(symbols)
  return useQueries({
    queries: names.map(earningsQuery),
    combine: (results) => {
      const out: Record<string, readonly string[]> = {}
      results.forEach((r, i) => {
        if (r.data) out[names[i]] = r.data.dates
      })
      return out
    },
  })
}
