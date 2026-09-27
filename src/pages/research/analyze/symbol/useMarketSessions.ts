import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchStockDailyCloses } from '@/api/marketData/dailyBars'
import { todayIso } from '@/lib/researchFreshness'

/**
 * The market's sessions, oldest first, read off SPY's year of closes. Trading
 * days are market-wide, and an index has no closes of its own (SPX), so a
 * name's own calendar would leave an index nothing to step through. The query
 * is the Symbol faces' year of closes, so one cache serves both.
 */
export function useMarketSessions(): string[] {
  const q = useQuery({
    queryKey: ['market', 'stock-daily-closes-1y', 'SPY'],
    queryFn: () =>
      fetchStockDailyCloses('SPY', new Date(Date.now() - 420 * 86_400_000).toISOString().slice(0, 10), todayIso()),
    staleTime: 10 * 60_000,
  })
  return useMemo(() => (q.data ?? []).map((c) => c.date), [q.data])
}
