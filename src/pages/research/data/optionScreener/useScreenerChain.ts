/**
 * The engine, asked once per name, at the widest window a slider can reach —
 * the sliders then filter in the browser (see `screenerModel.ts`).
 *
 * One request per name rather than one for the list. Measured 2026-09-23 on
 * DEV: a single name at the widest window answers in about 15 s, and three in
 * one request ran past the client's 60-second abort, so a list screened as a
 * whole could only ever come back as a timeout. Asked separately, each name
 * stays well inside the abort even if the engine serves them in turn; names
 * fill in as they answer, and one that times out costs only itself.
 *
 * Keyed by the name, the structure and the earnings choice, and nothing else:
 * a slider never refetches. Cached for five minutes, because the call is slow
 * and going back to a list already screened should not be.
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
    return 'no answer inside 60 s — the engine costs about ten seconds a name'
  }
  return error instanceof Error ? error.message : 'the request failed'
}

export function useScreenerChain(args: {
  symbols: readonly string[]
  structure: string
  includeEarnings: boolean
  /** False for a structure the engine does not screen. */
  enabled: boolean
}): ScreenerChain {
  const { symbols, structure, includeEarnings, enabled } = args
  const names = [...new Set(symbols)].sort()

  return useQueries({
    queries: names.map((sym) => ({
      queryKey: [...QUERY_KEYS.research.screener, 'chain', sym, structure, includeEarnings],
      queryFn: () =>
        fetchScreenerResults({
          structure_type: structure,
          symbols: [sym],
          include_earnings_span: includeEarnings,
          source: 'massive',
          min_annualized_return: null,
          max_spread_pct: null,
          min_premium: null,
          ...FETCH_WINDOW,
        }),
      enabled,
      staleTime: 5 * 60_000,
      // A failed screen is a long wait; do not repeat it behind the reader's back.
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
