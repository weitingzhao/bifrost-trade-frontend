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
 * A session is computed after its trade date's close, so it forecasts the
 * session that follows. Until research 0.126.0 the settlement scored it
 * against its own date's close — the price it already knew (PLTR 24 of 29
 * settlements had actual == spot) — and this panel withheld every figure.
 * 0.126.0 settles against the next session and stamps `stats_json.target_date`;
 * a row without it was written under the old rule and is not a forecast result.
 */
export function isForecastSettlement(s: ForecastSettlement | null | undefined): s is ForecastSettlement {
  return Boolean(s && typeof s.stats_json?.target_date === 'string')
}

/** The session a settlement scored the forecast against (the next trading day). */
export function settlementTarget(s: ForecastSettlement): string | null {
  const t = s.stats_json?.target_date
  return typeof t === 'string' ? t : null
}

/** Whether the path was judged on hourly prints or, lacking them, the close alone. */
export function settlementBasis(s: ForecastSettlement): 'hourly' | 'close' | null {
  const b = s.stats_json?.path_basis
  return b === 'hourly' || b === 'close' ? b : null
}

/**
 * research 0.127.0 stamps a settlement whose forecast was drawn from GEX walls
 * nowhere near the price (`walls_off_spot`): the July–August 2026 terrain was
 * backfilled from chains of a handful of contracts, and PLTR's walls sat on 20
 * against a 131.53 close. Such a row measures that input, so every rate leaves
 * it out; the list still shows it.
 */
export function settlementInputFault(s: ForecastSettlement | null | undefined): string | null {
  const f = s?.stats_json?.input_fault
  return typeof f === 'string' && f ? f : null
}

export const INPUT_FAULT_NOTE =
  'The target was drawn from GEX walls nowhere near the price — the option chain behind them held a handful of contracts — so its miss measures that input, not the forecast. Left out of every rate.'

export const LEGACY_SETTLEMENT_NOTE =
  'Settled under the rule before research 0.126.0 — against the close already known when the session was computed — so it is not a forecast result.'

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
