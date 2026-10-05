/**
 * NYSE's closures and early closes for this year and next, from the market
 * service — the calendar the freshness rule (§16.13) judges regular hours by.
 *
 * Until it answers (or if it fails) the rule falls back to weekdays alone:
 * a holiday then reads as a trading day, which can only ever make a stamp
 * *more* cautious, never hide a stale one.
 */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchMarketHolidays } from '@/api/market'
import { tradingCalendar, type TradingCalendar } from '@/lib/freshness'

/**
 * The rows themselves — date, label, closed or early close — for a reader
 * that prints them (the Calendar's closed / half-day marks). One read for
 * both: the freshness rule derives its calendar from the same cache entry.
 */
export function useNyseHolidays() {
  const year = new Date().getFullYear()
  return useQuery({
    queryKey: ['market', 'holidays', 'NYSE', year],
    queryFn: async () => {
      const [a, b] = await Promise.all([fetchMarketHolidays(year, 'NYSE'), fetchMarketHolidays(year + 1, 'NYSE')])
      return [...a, ...b]
    },
    staleTime: 12 * 3600_000,
    retry: 1,
  })
}

export function useTradingCalendar(): TradingCalendar | undefined {
  const rows = useNyseHolidays().data
  return useMemo(() => (rows ? tradingCalendar(rows) : undefined), [rows])
}
