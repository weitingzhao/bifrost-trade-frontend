/**
 * The next print for a set of names — one Research read per 500 names
 * (`/research/narrative/earnings/batch`, research 0.193.0, TD-158), not one per
 * name. Each answer also fills the per-name cache the Symbol page reads
 * (`useEarningsDates`, same key), so a name opened next is not asked again.
 * See `utils/earningsReading.ts` for the source and the rule.
 *
 * Read by the Option screen, the Events Book face, the Calendar's Events layer
 * (§14.2: moved out of the screener when Events became its second reader) and
 * Stock screen across its whole universe.
 */
import { useCallback, useMemo } from 'react'
import { useQueries, useQueryClient, type QueryClient, type UseQueryResult } from '@tanstack/react-query'
import { EARNINGS_BATCH_MAX, fetchEarningsDatesBatch, type EarningsDates } from '@/api/research/narrative'
import { readEarnings, type EarningsReading } from '@/utils/earningsReading'

const STALE = 60 * 60_000

function namesOf(symbols: readonly string[]): string[] {
  return [...new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))].sort()
}

/** The per-name key — `useEarningsDates` on the Symbol page reads the same one. */
export function earningsKey(sym: string) {
  return ['research-engine', 'narrative', 'earnings', sym] as const
}

/** Sorted names in calls of at most `EARNINGS_BATCH_MAX`. */
export function earningsChunks(names: readonly string[], size = EARNINGS_BATCH_MAX): string[][] {
  const out: string[][] = []
  for (let i = 0; i < names.length; i += size) out.push(names.slice(i, i + size))
  return out
}

function batchQuery(qc: QueryClient, chunk: string[]) {
  return {
    queryKey: ['research-engine', 'narrative', 'earnings-batch', chunk.join(',')],
    queryFn: async () => {
      const data = await fetchEarningsDatesBatch(chunk)
      for (const sym of chunk) if (data[sym]) qc.setQueryData(earningsKey(sym), data[sym])
      return data
    },
    staleTime: STALE,
    retry: false,
  }
}

/** Per name: the reading, the error that kept it unread, or absent while loading. */
type Read = { data: EarningsDates } | { error: string }

function useEarningsReads(symbols: readonly string[]): Record<string, Read> {
  const qc = useQueryClient()
  const key = namesOf(symbols).join(',')
  const chunks = useMemo(() => earningsChunks(key ? key.split(',') : []), [key])
  // A stable `combine`: the map changes only when an answer does, so a list of
  // 3,700 names is not re-read on every render.
  const combine = useCallback(
    (results: UseQueryResult<Record<string, EarningsDates>>[]) => {
      const out: Record<string, Read> = {}
      results.forEach((r, i) => {
        if (r.isPending) return
        for (const sym of chunks[i] ?? []) {
          const d = r.data?.[sym]
          if (r.isError) out[sym] = { error: (r.error as Error).message }
          else if (d) out[sym] = { data: d }
          else out[sym] = { error: 'the batch answered without this name' }
        }
      })
      return out
    },
    [chunks],
  )
  return useQueries({ queries: chunks.map((c) => batchQuery(qc, c)), combine })
}

/**
 * Name → reading; a name still loading is absent, not `none`. The map is a new
 * object whenever an answer lands, so a caller's memo must list it as a
 * dependency — leaving it out froze the group rows at "earnings …" after every
 * read had landed (walk 2026-09-27).
 *
 * `ask` (default all) limits which names the batch fetches. A name left out is
 * still answered when the per-name cache already holds it — Scan's All universe
 * asks the selected row and keeps dates other pages have read, without one
 * request per name.
 */
export function useNamesEarnings(
  symbols: readonly string[],
  ask: boolean | ((symbol: string) => boolean) = true,
): Record<string, EarningsReading> {
  const qc = useQueryClient()
  const nameKey = namesOf(symbols).join(',')
  const askedKey = (nameKey ? nameKey.split(',') : [])
    .filter((sym) => (typeof ask === 'function' ? ask(sym) : ask))
    .join(',')
  const reads = useEarningsReads(askedKey ? askedKey.split(',') : [])
  return useMemo(() => {
    const out: Record<string, EarningsReading> = {}
    for (const [sym, r] of Object.entries(reads)) {
      if ('data' in r) out[sym] = readEarnings(r.data)
      else {
        const reason = `earnings read failed — ${r.error}`
        out[sym] = { kind: 'none', reason, absence: { code: 'unread', text: reason } }
      }
    }
    for (const sym of nameKey ? nameKey.split(',') : []) {
      if (out[sym]) continue
      const cached = qc.getQueryData<EarningsDates>(earningsKey(sym))
      if (cached) out[sym] = readEarnings(cached)
    }
    return out
  }, [reads, nameKey, qc])
}

/**
 * The results releases on file for a set of names — the 8-K dates the next
 * print is estimated from, oldest first (the Calendar's past prints, Rev .157).
 * The same reads as `useNamesEarnings`; a name still loading or failed is absent.
 */
export function useNamesResultDates(symbols: readonly string[]): Record<string, readonly string[]> {
  const reads = useEarningsReads(symbols)
  return useMemo(() => {
    const out: Record<string, readonly string[]> = {}
    for (const [sym, r] of Object.entries(reads)) if ('data' in r) out[sym] = r.data.dates
    return out
  }, [reads])
}
