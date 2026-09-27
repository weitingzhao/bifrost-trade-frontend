/**
 * The engine, asked once per name, at the widest window a slider can reach —
 * the sliders then filter in the browser (see `screenerModel.ts`).
 *
 * One request per name rather than one for the list: names fill in as they
 * answer, one that fails costs only itself, and a name already screened is
 * cached when it turns up in another source. The split began as a latency
 * workaround (2026-09-23: about 15 s a name, three past the 60-second abort);
 * since the engine fix of 2026-09-27 a name answers in about 0.1 s, and the
 * split stays for those three reasons.
 *
 * Keyed by the name and the structure, and nothing else: a slider never
 * refetches, and neither does the earnings toggle — the engine accepts
 * `include_earnings_span` and never reads it, so earnings is filtered in the
 * browser against each name's expected print (`screenerEarnings.ts`).
 * Cached for five minutes, so going back to a list already screened does not
 * ask again.
 */
import { useQueries } from '@tanstack/react-query'
import { fetchScreenerResults } from '@/api/research'
import { QUERY_KEYS } from '@/constants/queryKeys'
import type { ScreenerResponse } from '@/types/research'
import { FETCH_WINDOW } from './screenerModel'

export interface ScreenerChain {
  /** Every settled name merged into one response; null until one settles. */
  data: ScreenerResponse | null
  /** Names still being screened. */
  pending: string[]
  isFetching: boolean
}

function reasonFor(error: unknown): string {
  if (error instanceof Error && error.name === 'AbortError') {
    return 'no answer inside 60 s'
  }
  return error instanceof Error ? error.message : 'the request failed'
}

export function useScreenerChain(args: {
  symbols: readonly string[]
  structure: string
  /** False for a structure the engine does not screen. */
  enabled: boolean
}): ScreenerChain {
  const { symbols, structure, enabled } = args
  const names = [...new Set(symbols)].sort()

  return useQueries({
    queries: names.map((sym) => ({
      queryKey: [...QUERY_KEYS.research.screener, 'chain', sym, structure],
      queryFn: () =>
        fetchScreenerResults({
          structure_type: structure,
          symbols: [sym],
          source: 'massive',
          min_annualized_return: null,
          max_spread_pct: null,
          min_premium: null,
          ...FETCH_WINDOW,
        }),
      enabled,
      staleTime: 5 * 60_000,
      // A failed screen is shown with its reason, not repeated behind the reader's back.
      retry: false,
    })),
    combine: (results) => {
      const pending: string[] = []
      const merged: ScreenerResponse = {
        ok: true,
        groups: [],
        symbols_scanned: [],
        symbols_failed: [],
        warnings: {},
      }
      let settled = 0
      results.forEach((r, i) => {
        const sym = names[i]
        if (r.isPending || (r.isFetching && !r.data)) {
          if (enabled) pending.push(sym)
          return
        }
        settled += 1
        merged.symbols_scanned!.push(sym)
        if (r.isError || !r.data) {
          // A name that did not answer is a name with no chain, and the reason
          // is the request's rather than the engine's.
          merged.symbols_failed!.push(sym)
          merged.warnings![sym] = reasonFor(r.error)
          return
        }
        merged.groups.push(...(r.data.groups ?? []))
        for (const f of r.data.symbols_failed ?? []) merged.symbols_failed!.push(f)
        Object.assign(merged.warnings!, r.data.warnings ?? {})
      })
      return {
        data: settled > 0 ? merged : null,
        pending,
        isFetching: results.some((r) => r.isFetching),
      }
    },
  })
}
