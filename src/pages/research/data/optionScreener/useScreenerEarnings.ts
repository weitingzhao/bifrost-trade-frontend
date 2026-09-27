/**
 * The next print for every name on the screen — one Research read per name,
 * keyed like the Symbol page's so a name already open there is not asked
 * again. See `screenerEarnings.ts` for the source and the rule.
 */
import { useQueries } from '@tanstack/react-query'
import { fetchEarningsDates } from '@/api/research/narrative'
import { readEarnings, type EarningsReading } from './screenerEarnings'

/**
 * Name → reading; a name still loading is absent, not `none`. The map is
 * rebuilt on every render (an inline `combine`), so a caller's memo must list
 * it as a dependency — leaving it out froze the group rows at "earnings …"
 * after every read had landed (walk 2026-09-27).
 */
export function useScreenerEarnings(symbols: readonly string[]): Record<string, EarningsReading> {
  const names = [...new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))].sort()
  return useQueries({
    queries: names.map((sym) => ({
      queryKey: ['research', 'narrative', 'earnings', sym],
      queryFn: () => fetchEarningsDates(sym),
      staleTime: 60 * 60_000,
      retry: false,
    })),
    combine: (results) => {
      const out: Record<string, EarningsReading> = {}
      results.forEach((r, i) => {
        if (r.isPending) return
        out[names[i]] = r.isError
          ? { kind: 'none', reason: `earnings read failed — ${(r.error as Error).message}` }
          : readEarnings(r.data)
      })
      return out
    },
  })
}
