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

/**
 * Name → reading; a name still loading is absent, not `none`. The map is
 * rebuilt on every render (an inline `combine`), so a caller's memo must list
 * it as a dependency — leaving it out froze the group rows at "earnings …"
 * after every read had landed (walk 2026-09-27).
 */
export function useNamesEarnings(symbols: readonly string[]): Record<string, EarningsReading> {
  const names = [...new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))].sort()
  return useQueries({
    queries: names.map((sym) => ({
      queryKey: ['research-engine', 'narrative', 'earnings', sym],
      queryFn: () => fetchEarningsDates(sym),
      staleTime: 60 * 60_000,
      retry: false,
    })),
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
