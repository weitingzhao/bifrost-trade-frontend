/**
 * NYSE's closures and early closes for this year and next, from the market
 * service — the calendar the freshness rule (§16.13) judges regular hours by.
 *
 * Until it answers (or if it fails) the rule falls back to weekdays alone:
 * a holiday then reads as a trading day, which can only ever make a stamp
 * *more* cautious, never hide a stale one.
 */
import { useQuery } from '@tanstack/react-query'
import { fetchMarketHolidays } from '@/api/monitor'
import { tradingCalendar, type TradingCalendar } from '@/lib/freshness'

export function useTradingCalendar(): TradingCalendar | undefined {
  const year = new Date().getFullYear()
  const q = useQuery({
    queryKey: ['market', 'holidays', 'NYSE', year],
    queryFn: async () => {
      const [a, b] = await Promise.all([fetchMarketHolidays(year, 'NYSE'), fetchMarketHolidays(year + 1, 'NYSE')])
      return tradingCalendar([...a, ...b])
    },
    staleTime: 12 * 3600_000,
    retry: 1,
  })
  return q.data
}
