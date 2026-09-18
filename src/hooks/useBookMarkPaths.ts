/**
 * A mark path for every closed trade in the book.
 *
 * Habits and Playbook stats are sample statistics: "gave back the peak" over
 * sixty trades means something, over the twelve that happened to load means
 * nothing. So this resolves as one query over the whole book rather than
 * per-row — the pages get a single loading state and either the whole sample or
 * none of it.
 *
 * The fan-out is by underlying and expiry, which is the cheapest bounded shape
 * the warehouse offers (see `fetchOptionDailyByExpiry`). Six at a time, because
 * the browser will not run more per origin anyway and queueing them here keeps
 * the order — and the failures — legible.
 */
import { useQuery } from '@tanstack/react-query'
import { fetchOptionDailyByExpiry, occToOptionTicker, type DailyBar } from '@/api/marketData/dailyBars'
import { buildMarkPath, type MarkPath } from '@/utils/reviewMarkPath'
import type { ReviewTrade } from '@/utils/reviewTrades'

const CONCURRENCY = 6

export interface BookMarkPaths {
  /** By contract key. A trade with no usable bar is absent rather than zeroed. */
  paths: Map<string, MarkPath>
  /** Trades the warehouse had no path for — the sample the pages must exclude. */
  without: string[]
}

const EMPTY: BookMarkPaths = { paths: new Map(), without: [] }

interface Group {
  symbol: string
  expiry: string
  from: string
  to: string
  trades: ReviewTrade[]
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/** One request per underlying and expiry, over the union of those trades' windows. */
export function groupForBars(trades: readonly ReviewTrade[], now: string): Group[] {
  const groups = new Map<string, Group>()
  for (const t of trades) {
    if (!t.underlying || !t.expiry || !t.openedOn || !t.closedOn) continue
    const key = `${t.underlying}|${t.expiry}`
    const g = groups.get(key)
    if (g == null) {
      groups.set(key, {
        symbol: t.underlying,
        expiry: t.expiry,
        from: t.openedOn,
        // No bar exists past expiry, and none past today either.
        to: t.expiry < now ? t.expiry : now,
        trades: [t],
      })
      continue
    }
    if (t.openedOn < g.from) g.from = t.openedOn
    g.trades.push(t)
  }
  return [...groups.values()]
}

async function inPools<T, R>(items: readonly T[], run: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let next = 0
  const worker = async () => {
    for (;;) {
      const i = next
      next += 1
      if (i >= items.length) return
      out[i] = await run(items[i])
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker))
  return out
}

export function useBookMarkPaths(trades: readonly ReviewTrade[]) {
  const now = today()
  const groups = groupForBars(trades, now)
  // The key is the book, not the render: two pages asking the same question
  // share one answer.
  const key = groups.map((g) => `${g.symbol}|${g.expiry}|${g.from}|${g.to}`).sort().join(',')

  const query = useQuery({
    queryKey: ['review', 'bookMarkPaths', key],
    enabled: groups.length > 0,
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    queryFn: async (): Promise<BookMarkPaths> => {
      const results = await inPools(groups, async (g) => {
        try {
          return { g, bars: await fetchOptionDailyByExpiry(g.symbol, g.expiry, g.from, g.to) }
        } catch {
          // One expiry the warehouse cannot answer must not take the book with
          // it; those trades land in `without` and the pages exclude them.
          return { g, bars: new Map<string, DailyBar[]>() }
        }
      })

      const paths = new Map<string, MarkPath>()
      const without: string[] = []
      for (const { g, bars } of results) {
        for (const t of g.trades) {
          const ticker = occToOptionTicker(t.contractKey)
          const path = ticker ? buildMarkPath(t, bars.get(ticker) ?? []) : null
          if (path) paths.set(t.contractKey, path)
          else without.push(t.contractKey)
        }
      }
      return { paths, without }
    },
  })

  return {
    ...(query.data ?? EMPTY),
    requests: groups.length,
    loading: groups.length > 0 && query.isLoading,
    error: query.error ?? null,
  }
}
