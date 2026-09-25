/**
 * The narrative lens, read (research `GET /research/narrative`).
 *
 * Three pages read it — Narrative lists the window, the Stock screen counts
 * names per 8-K condition, Symbol shows one name's rows — so the query lives
 * here and each asks for the shape it needs. `limit` and `symbol` are part of
 * the key: a page that must see the whole window asks for all of it, and a
 * page that reads one name never shares a cache entry with one that reads
 * every name.
 */
import { useQuery } from '@tanstack/react-query'
import { fetchNarrative } from '@/api/research/narrative'

const STALE_MS = 5 * 60_000

/** Every name's tags in the last `days`. The server caps `limit` at 2000. */
export function useNarrativeWindow(days: number, opts: { limit?: number; enabled?: boolean } = {}) {
  const limit = opts.limit
  return useQuery({
    queryKey: ['research', 'narrative', days, 'all', limit ?? null],
    queryFn: () => fetchNarrative(days, { limit }),
    staleTime: STALE_MS,
    enabled: opts.enabled ?? true,
  })
}

/** One name's tags in the last `days`, with its coverage (research 0.112.0+). */
export function useSymbolNarrative(symbol: string | null | undefined, days: number) {
  const sym = symbol?.trim().toUpperCase() || null
  return useQuery({
    queryKey: ['research', 'narrative', days, 'symbol', sym],
    queryFn: () => fetchNarrative(days, { symbol: sym ?? undefined }),
    staleTime: STALE_MS,
    enabled: sym != null,
  })
}
