/**
 * The fired-alerts window — one query, two readers (§14.2): the Alerts page
 * lists it, and the rail's Market group counts today's rows under its head
 * (design §5a.10: the amber count = alerts fired today, mirroring the page's
 * FIRED — "app: one alerts API", so the two cannot disagree).
 *
 * `/research/alerts` holds only what has fired; what is armed lives with the
 * rules. The caps are the store's own: it refuses more than 200 rows or 90
 * days.
 */
import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { fetchAlerts, type AlertsResponse } from '@/api/research/alertScan'

export const ALERTS_WINDOW_DAYS = 90
export const ALERTS_ROW_CAP = 200

export function useFiredAlerts(): UseQueryResult<AlertsResponse> {
  return useQuery({
    queryKey: ['research', 'alerts', 'page', ALERTS_WINDOW_DAYS],
    queryFn: () => fetchAlerts({ limit: ALERTS_ROW_CAP, days: ALERTS_WINDOW_DAYS }),
    staleTime: 60_000,
  })
}

/** How many fired today — the rail's amber count. Zero until the store answers. */
export function firedTodayCount(data: AlertsResponse | undefined, today: string): number {
  return (data?.items ?? []).filter((i) => i.trade_date === today).length
}
