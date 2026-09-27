/**
 * The Dealer face's two history panels — the ones its first walk seated as
 * «unmeasured» and the stores answer (Owner 2026-09-26, DESIGN_CONTRACTS
 * §15.6):
 *
 * - Regime timeline — `/research/gex/levels` answers any past trade date, one
 *   date a call. Each session is read at the gex_regime exhibit's own expiry,
 *   so the timeline's walls are the same figures as the Gamma levels panel
 *   above it (the terrain's inputs carry a front-expiry set that disagrees:
 *   PLTR 09-25 walls 190/190 there, 180/175 at the exhibit's 10-23).
 * - Max pain vs spot — the market-data plugin's
 *   `/market/analytics/max-pain/compute/history` (PLTR 10-23: 55 sessions)
 *   against the name's own daily closes.
 * - Intraday — `/research/gex/intraday`, the session's snapshots over every
 *   expiry, for the newest session or any past one (the route takes a date;
 *   the retired GEX section read it off the shell's date). Until research
 *   0.128.0 the job found no spot during the session and wrote only SPX from
 *   09-08; it now runs on the names the plugin's intraday chain observes,
 *   standing on the prior close.
 *
 * The two dated panels mark earnings as the IV charts do: a results 8-K's
 * session is marked E (a late estimate E?), and the max-pain chart points
 * to the next estimated print past its last session.
 */
import { useState } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { fetchGexIntraday, fetchGexLevels } from '@/api/researchEngine'
import { GexTimelineChart } from '@/components/charts/GexTimelineChart'
import { fmtEtClock } from '@/lib/format'
import { fetchStockDailyCloses, type DailyBar } from '@/api/marketData/dailyBars'
import { useEarningsDates } from '@/hooks/useNarrative'
import { todayIso } from '@/lib/researchFreshness'
import { cn } from '@/lib/utils'
import { rankPathEarnings, type RankPathMark } from './rankPathEarnings'
import { SessionStepper } from './SessionStepper'
import { useMarketSessions } from './useMarketSessions'

const cap = 'whitespace-nowrap text-dense-meta font-semibold text-muted-foreground'
const th =
  'whitespace-nowrap border-b border-border px-2 py-1 text-right align-bottom text-dense-caption font-semibold text-secondary-foreground'
const td = 'whitespace-nowrap border-b border-border/55 px-2 py-1.25 text-right font-mono text-xs tabular-nums'
const TIMELINE_SESSIONS = 12

const etClock = (ts: string) => fmtEtClock(new Date(ts)).slice(0, 5)
const fmtGex = (v: number | null) => {
  if (v == null) return '—'
  const a = Math.abs(v)
  const body = a >= 1e9 ? `${(a / 1e9).toFixed(2)}B` : `${(a / 1e6).toFixed(1)}M`
  return `${v >= 0 ? '+' : '−'}${body}`
}

/** A year of daily closes — the same query the Volatility face reads, so one cache serves both. */
function useSymbolCloses(sym: string) {
  return useQuery({
    queryKey: ['market', 'stock-daily-closes-1y', sym],
    queryFn: () =>
      fetchStockDailyCloses(sym, new Date(Date.now() - 420 * 86_400_000).toISOString().slice(0, 10), todayIso()),
    enabled: Boolean(sym),
    staleTime: 10 * 60_000,
  })
}

export interface TimelineRow {
  date: string
  spot: number | null
  zeroGamma: number | null
  callWall: number | null
  putWall: number | null
  /** Spot above zero γ: dealers long gamma, they damp. */
  longGamma: boolean | null
  /** Close-to-close change into the next session; null on the newest. */
  nextMove: number | null
  /** A results 8-K's session (or where a late print was expected). */
  earnings?: RankPathMark | null
}

const numOf = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

/**
 * The last sessions' levels at one expiry, oldest first. Trading dates come
 * from the name's closes, which also give the next-day move.
 */
export function useDealerTimeline(sym: string, expiry: string | null) {
  const closesQ = useSymbolCloses(sym)
  const earnQ = useEarningsDates(sym)
  const closes: DailyBar[] = closesQ.data ?? []
  const tail = closes.slice(-TIMELINE_SESSIONS)
  const levelQs = useQueries({
    queries: tail.map((b) => ({
      queryKey: ['research', 'gex-levels', sym, b.date, expiry],
      queryFn: () => fetchGexLevels(sym, b.date, expiry ?? undefined),
      enabled: Boolean(sym && expiry),
      staleTime: 30 * 60_000,
    })),
  })
  const marks = rankPathEarnings(
    tail.map((b) => b.date),
    earnQ.data?.dates ?? [],
    earnQ.data?.expected_next ?? null
  ).marks
  const rows: TimelineRow[] = tail.map((b, i) => {
    const raw = (levelQs[i]?.data?.rows ?? [])[0] as Record<string, unknown> | undefined
    const spot = numOf(raw?.spot)
    const zeroGamma = numOf(raw?.zero_gamma)
    const at = closes.length - tail.length + i
    const next = closes[at + 1]?.close
    const cur = b.close
    return {
      date: b.date,
      spot,
      zeroGamma,
      callWall: numOf(raw?.major_call_wall),
      putWall: numOf(raw?.major_put_wall),
      longGamma: spot != null && zeroGamma != null ? spot > zeroGamma : null,
      nextMove: next != null && cur != null && cur > 0 ? (next / cur - 1) * 100 : null,
      earnings: marks[i],
    }
  })
  // Sessions on the newest row's side of zero γ, counted back without a break.
  const newest = [...rows].reverse().find((r) => r.longGamma != null)
  let streak = 0
  if (newest) {
    for (let i = rows.length - 1; i >= 0; i--) {
      if (rows[i].longGamma == null) continue
      if (rows[i].longGamma !== newest.longGamma) break
      streak += 1
    }
  }
  const loading = closesQ.isLoading || levelQs.some((q) => q.isLoading)
  return { rows, streak: newest ? streak : null, longGamma: newest?.longGamma ?? null, loading }
}

export function DealerRegimeTimeline({
  rows,
  loading,
  expiry,
}: {
  rows: TimelineRow[]
  loading: boolean
  expiry: string | null
}) {
  const shown = rows.filter((r) => r.spot != null)
  if (shown.length === 0) {
    return (
      <p className="m-0 px-3 py-3 text-dense-meta text-muted-foreground">
        {loading
          ? 'Loading the levels history…'
          : expiry
            ? `The levels store holds no session at the ${expiry} expiry in the last ${TIMELINE_SESSIONS} trading days.`
            : 'No gex_regime expiry to read the levels at.'}
      </p>
    )
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={cn(th, 'text-left')}>Session</th>
            <th className={th}>Spot</th>
            <th className={th}>Zero γ</th>
            <th className={th}>Call wall</th>
            <th className={th}>Put wall</th>
            <th className={cn(th, 'text-left')}>Regime</th>
            <th className={th} title="Close-to-close change into the next session — the realised check of damp vs chase.">
              Next-day move
            </th>
          </tr>
        </thead>
        <tbody>
          {shown.map((r) => (
            <tr key={r.date}>
              <td className={cn(td, 'text-left text-muted-foreground')}>
                {r.date.slice(5)}
                {r.earnings ? (
                  <span className={cn('ml-1.5 text-warning', r.earnings.kind === 'late' && 'opacity-60')} title={r.earnings.title} data-timeline-earnings={r.earnings.kind}>
                    {r.earnings.kind === 'late' ? 'E?' : 'E'}
                  </span>
                ) : null}
              </td>
              <td className={td}>{r.spot?.toFixed(2)}</td>
              <td className={cn(td, 'text-warning')}>{r.zeroGamma != null ? r.zeroGamma.toFixed(1) : '—'}</td>
              <td className={cn(td, 'text-muted-foreground')}>{r.callWall ?? '—'}</td>
              <td className={cn(td, 'text-muted-foreground')}>{r.putWall ?? '—'}</td>
              <td className={cn(td, 'text-left font-sans', r.longGamma === false ? 'text-warning' : 'text-foreground')}>
                {r.longGamma == null ? '—' : r.longGamma ? 'long γ' : 'short γ'}
              </td>
              <td
                className={cn(
                  td,
                  r.nextMove == null ? 'text-muted-foreground' : Math.abs(r.nextMove) > 3 ? 'text-destructive' : 'text-muted-foreground',
                )}
              >
                {r.nextMove == null ? '—' : `${r.nextMove >= 0 ? '+' : '−'}${Math.abs(r.nextMove).toFixed(1)}%`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * The session's intraday GEX: every snapshot the intraday job wrote for the
 * newest date it holds — or for a session stepped back to, one of the name's
 * own trading days — over all expiries (the panels above read one expiry).
 * Spot is the prior close until the session's own close lands — the store keeps
 * no intraday price; an index is priced by put–call parity — so what moves
 * through the day is the session's gamma and volume from the plugin's intraday
 * chain (10:30 · 13:00 · 15:30 New York).
 */
export function DealerIntraday({ sym }: { sym: string }) {
  // No pick reads the newest session the store holds; a pick belongs to one name.
  const [picked, setPicked] = useState<{ sym: string; date: string } | null>(null)
  const pick = picked?.sym === sym ? picked.date : null
  const q = useQuery({
    queryKey: ['research', 'gex-intraday', sym, pick ?? 'newest'],
    queryFn: () => fetchGexIntraday(sym, pick ?? undefined),
    enabled: Boolean(sym),
    staleTime: 5 * 60_000,
  })
  const sessions = useMarketSessions()
  const rows = [...(q.data?.rows ?? [])].sort((a, b) => a.asof_ts.localeCompare(b.asof_ts))
  const day = pick ?? (q.data?.trade_date || rows[0]?.trade_date || '')
  const lastSession = sessions[sessions.length - 1] ?? ''
  const stale = !pick && Boolean(day && lastSession && day < lastSession)
  const last = rows[rows.length - 1]
  const go = (date: string | null) => setPicked(date ? { sym, date } : null)

  return (
    <>
      <header className="flex flex-wrap items-center gap-2.5 border-b px-3 py-1.75 text-dense-body leading-normal">
        <span className={cap}>Intraday</span>
        <span className="text-dense-body font-semibold">session gamma</span>
        <SessionStepper day={day} sessions={sessions} picked={Boolean(pick)} onGo={go} label="Intraday session" />
        <span className="ml-auto text-dense-caption text-muted-foreground">
          {rows.length > 0
            ? `${rows.length} snapshot${rows.length === 1 ? '' : 's'} · last ${etClock(last!.asof_ts)} ET · all expiries`
            : 'all expiries'}
        </span>
      </header>
      {q.isLoading ? (
        <p className="m-0 px-3 py-3 text-dense-meta text-muted-foreground">Loading the session’s snapshots…</p>
      ) : q.isError ? (
        <p className="m-0 px-3 py-3 text-dense-meta text-destructive">
          {q.error instanceof Error ? q.error.message : 'The intraday route failed.'}
        </p>
      ) : rows.length === 0 ? (
        <p className="m-0 px-3 py-3 text-dense-meta leading-normal text-muted-foreground text-pretty">
          No intraday snapshot for {sym}{pick ? ` on ${pick}` : ''}. The intraday job reads the names the
          plugin&rsquo;s intraday chain observes — the watchlist and benchmarks, 26 on DEV — at :45 past each
          hour, 10:45–16:45 New York. Before 2026-09-28 the store holds SPX from 09-08 and one or two sessions
          (08-20, 09-02) of the rest.
        </p>
      ) : (
        <div className="grid grid-cols-1 items-start gap-3 px-3 py-2 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            {stale ? (
              <p className="m-0 pb-1 text-dense-meta leading-normal text-warning text-pretty">
                Last computed {day}; the newest session is {lastSession}. Until research 0.128.0 the intraday job
                found no spot during the session and wrote only SPX, so this name&rsquo;s timeline stops there.
              </p>
            ) : null}
            <GexTimelineChart rows={rows} height={220} />
          </div>
          <div className="min-w-0 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={cn(th, 'text-left')}>ET</th>
                  <th className={th}>Spot</th>
                  <th className={th}>Zero γ</th>
                  <th className={th}>Call wall</th>
                  <th className={th}>Put wall</th>
                  <th className={th}>Net GEX</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.asof_ts}>
                    <td className={cn(td, 'text-left text-muted-foreground')}>{etClock(r.asof_ts)}</td>
                    <td className={td}>{r.spot?.toFixed(2) ?? '—'}</td>
                    <td className={cn(td, r.spot != null && r.zero_gamma != null && r.spot > r.zero_gamma ? 'text-success' : 'text-destructive')}>
                      {r.zero_gamma?.toFixed(2) ?? '—'}
                    </td>
                    <td className={td}>{r.major_call_wall ?? '—'}</td>
                    <td className={td}>{r.major_put_wall ?? '—'}</td>
                    <td className={cn(td, (r.total_net_gex ?? 0) >= 0 ? 'text-success' : 'text-destructive')}>
                      {fmtGex(r.total_net_gex)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
