/**
 * One name's forecast sessions, folded to one row per trade date and joined
 * to their settlements — the Scenario face's two panels read the same list.
 *
 * Measured on DEV (2026-09-26): every trade date carries two sessions — the
 * one computed the night after the session (the one settlement picks up) and
 * a re-run a night later that is never settled (PLTR: 194 sessions over 54
 * dates, 29 settlements). Counting both made a two-week-old date read as
 * «pending». The fold keeps the settled session, else the earliest, and says
 * how many re-runs it set aside.
 */
import { useQuery } from '@tanstack/react-query'
import {
  fetchForecastSessions,
  fetchSettlements,
  type ForecastSession,
  type ForecastSettlement,
} from '@/api/researchEngine'

export interface SessionDay {
  trade_date: string
  session: ForecastSession
  settlement: ForecastSettlement | null
  /** Other sessions computed for the same trade date, set aside by the fold. */
  reruns: number
}

/**
 * Why no settlement figure is printed: the settlement scores a session
 * against its own trade date's close, and the session is computed after that
 * close — its spot *is* that close (PLTR 24 of 29 settlements, SPY 21/29,
 * AAPL 23/27 on DEV). Hit, miss and calibration therefore measure hindsight,
 * not forecasting, until Research settles against the session that follows.
 */
export const SETTLEMENT_WITHHELD_REASON =
  'Withheld: the settlement scores each forecast against the close that was already known when it was computed (the session’s own spot), so hit, miss and calibration measure hindsight, not forecasting. Research fix pending.'

export function foldSessionDays(
  sessions: readonly ForecastSession[],
  settlements: readonly ForecastSettlement[],
): SessionDay[] {
  const settledById = new Map(settlements.map((s) => [s.session_id, s]))
  const byDate = new Map<string, ForecastSession[]>()
  for (const s of sessions) {
    const list = byDate.get(s.trade_date)
    if (list) list.push(s)
    else byDate.set(s.trade_date, [s])
  }
  return [...byDate.entries()]
    .map(([trade_date, list]) => {
      const ordered = [...list].sort((a, b) => a.computed_at.localeCompare(b.computed_at))
      const settledOne = ordered.find((s) => settledById.has(s.session_id))
      const session = settledOne ?? ordered[0]
      return {
        trade_date,
        session,
        settlement: settledById.get(session.session_id) ?? null,
        reruns: ordered.length - 1,
      }
    })
    .sort((a, b) => b.trade_date.localeCompare(a.trade_date))
}

export function useSymbolForecastSessions(symbol: string) {
  const sym = symbol.trim().toUpperCase()
  const sessQ = useQuery({
    queryKey: ['research', 'forecast-sessions', sym, 200],
    queryFn: () => fetchForecastSessions(sym, undefined, 200),
    enabled: Boolean(sym),
    staleTime: 5 * 60_000,
  })
  const settQ = useQuery({
    queryKey: ['research', 'forecast-settlements', sym],
    queryFn: () => fetchSettlements(sym, undefined, 200),
    enabled: Boolean(sym),
    staleTime: 5 * 60_000,
  })
  const days = foldSessionDays(sessQ.data?.rows ?? [], settQ.data?.rows ?? [])
  return {
    days,
    isLoading: sessQ.isLoading || settQ.isLoading,
    sessionCount: sessQ.data?.rows.length ?? 0,
  }
}
