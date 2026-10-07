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
import { fetchAlerts, type AlertsResponse, type AnalyzeAlert } from '@/api/research/alertScan'
import { etDayOf } from '@/lib/freshness'

export const ALERTS_WINDOW_DAYS = 90
export const ALERTS_ROW_CAP = 200

export function useFiredAlerts(): UseQueryResult<AlertsResponse> {
  return useQuery({
    queryKey: ['research-engine', 'alerts', 'page', ALERTS_WINDOW_DAYS],
    queryFn: () => fetchAlerts({ limit: ALERTS_ROW_CAP, days: ALERTS_WINDOW_DAYS }),
    staleTime: 60_000,
  })
}

/**
 * Whether an alert fired on the New York day `today` (`etTodayIso()`).
 *
 * Fired is when the scan wrote it — `computed_at`, read as a New York day — and
 * never `trade_date`: alert_scan stamps each alert with the session it judges
 * and writes it on a later day (computed_at 2026-10-05T22:30Z carries
 * trade_date 2026-10-02), so a trade_date can never equal today and a count
 * keyed on it is always 0 (TD-219). No `computed_at` means the store did not
 * say when, and an unknown is not counted as today.
 */
export function firedOn(item: Pick<AnalyzeAlert, 'computed_at'>, today: string): boolean {
  return item.computed_at != null && etDayOf(item.computed_at) === today
}

/** How many fired today — the rail's amber count. Zero until the store answers. */
export function firedTodayCount(data: AlertsResponse | undefined, today: string): number {
  return (data?.items ?? []).filter((i) => firedOn(i, today)).length
}
