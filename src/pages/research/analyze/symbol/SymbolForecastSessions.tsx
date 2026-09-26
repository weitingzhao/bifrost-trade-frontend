/**
 * Forecast sessions — how the paths settled (design `Research Symbol.dc.html`,
 * §isScenario, second panel).
 *
 * One row per trade date on this name over 30 days — re-runs of a date are
 * folded (`useSymbolForecastSessions`) — and each row opens the session in the
 * inspector: what the model said, hour by hour, and the structures it ranked.
 *
 * A session is computed after its date's close and forecasts the next
 * session; research 0.126.0 settles it against that session's close and
 * hourly bars (it had been scored against the close it already knew, and this
 * panel withheld every figure until the fix). The path is judged hour by hour
 * where the plugin keeps 1-hour bars for the name, on the close alone where it
 * does not — the header says how many of each. Below the list, the model's
 * own calibration by regime over 180 days.
 */
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { fetchForecastCalibration } from '@/api/researchEngine'
import { RightInspectorShell } from '@/components/layout/RightInspectorShell'
import { cn } from '@/lib/utils'
import { SymbolSessionInspector } from './SymbolSessionInspector'
import {
  INPUT_FAULT_NOTE,
  LEGACY_SETTLEMENT_NOTE,
  isForecastSettlement,
  settlementBasis,
  settlementInputFault,
  settlementTarget,
  useSymbolForecastSessions,
} from './useSymbolForecastSessions'

const cap =
  'whitespace-nowrap text-dense-meta font-semibold text-muted-foreground'
const mono = 'font-mono tabular-nums'
const panel =
  'min-w-0 border mat-card'
const panelHead =
  'flex flex-wrap items-center gap-2.5 border-b px-3 py-1.75 text-dense-body leading-normal'
const th =
  'sticky top-0 z-[1] whitespace-nowrap border-b border-border bg-card px-2 py-1 text-right align-bottom text-dense-caption font-semibold text-secondary-foreground'
const td = 'whitespace-nowrap border-b border-border/40 px-2 py-1 text-right font-mono text-dense-meta tabular-nums'
const tl = 'text-left'
const SESSION_PARAM = 'session'
const WINDOW_DAYS = 30

const daysAgoIso = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10)
const pctOf = (v: number | null | undefined, digits = 0) => (v == null ? '—' : `${(v * 100).toFixed(digits)}%`)
const signedPct = (v: number, digits = 1) => `${v >= 0 ? '+' : '−'}${Math.abs(v * 100).toFixed(digits)}%`

export function SymbolForecastSessions({ symbol }: { symbol: string }) {
  const sym = symbol.trim().toUpperCase()
  const { days: allDays, isLoading } = useSymbolForecastSessions(sym)
  const since = daysAgoIso(WINDOW_DAYS)
  const days = allDays.filter((d) => d.trade_date >= since)
  const newestSettled = days.find((d) => d.settlement != null)?.trade_date ?? ''
  const settled = days.map((d) => d.settlement).filter(isForecastSettlement)
  const scored = settled.filter((s) => !settlementInputFault(s))
  const faults = settled.length - scored.length
  const n = scored.length
  const hits = scored.filter((s) => s.path_hit).length
  const dirKnown = scored.filter((s) => typeof s.stats_json?.direction_hit === 'boolean')
  const dirHits = dirKnown.filter((s) => s.stats_json?.direction_hit === true).length
  const avgMiss = n > 0 ? scored.reduce((a, s) => a + Math.abs(s.close_miss_pct), 0) / n : null
  const onHourly = scored.filter((s) => settlementBasis(s) === 'hourly').length
  const legacy = days.filter((d) => d.settlement != null && !isForecastSettlement(d.settlement)).length
  const pending = days.filter((d) => d.settlement == null && d.trade_date > newestSettled).length
  const reruns = days.reduce((a, d) => a + d.reruns, 0)

  const calQ = useQuery({
    queryKey: ['research', 'forecast-calibration', sym, 180],
    queryFn: () => fetchForecastCalibration(sym, 180),
    enabled: Boolean(sym),
    staleTime: 30 * 60_000,
  })
  const cal = calQ.data?.rows ?? []

  const [params, setParams] = useSearchParams()
  const openId = params.get(SESSION_PARAM)
  const openDay = openId ? allDays.find((d) => d.session.session_id === openId) ?? null : null
  const setOpen = (id: string | null) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (id) next.set(SESSION_PARAM, id)
        else next.delete(SESSION_PARAM)
        return next
      },
      { replace: true },
    )

  const basisTitle =
    n === 0
      ? undefined
      : `Judged hour by hour on ${onHourly} of ${n} sessions (the plugin keeps 1-hour bars for this name on those days); the rest on the close alone — within 1% of the target.`

  return (
    <section className={panel}>
      <header className={panelHead}>
        <span className={cap}>Forecast sessions</span>
        <span className="text-dense-body font-semibold">how the paths settled</span>
        <span className="ml-auto text-dense-caption text-muted-foreground" title={basisTitle}>
          {WINDOW_DAYS}d hit{' '}
          <b className={cn(mono, 'text-foreground')}>{n > 0 ? `${pctOf(hits / n)} (n=${n})` : '—'}</b> · direction{' '}
          <b className={cn(mono, 'text-foreground')}>{dirKnown.length > 0 ? pctOf(dirHits / dirKnown.length) : '—'}</b> · avg
          |miss| <b className={cn(mono, 'text-foreground')}>{pctOf(avgMiss, 1)}</b> · pending{' '}
          <b className={cn(mono, 'text-foreground')}>{pending}</b>
        </span>
      </header>
      {days.length === 0 ? (
        <p className="m-0 px-3 py-4 text-dense-meta text-muted-foreground">
          {isLoading ? 'Loading sessions…' : `No forecast sessions on this name in the last ${WINDOW_DAYS} days.`}
        </p>
      ) : (
        <div className="max-h-[22rem] overflow-y-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={cn(th, tl)}>Session</th>
                <th className={cn(th, tl)}>Path</th>
                <th className={th}>Spot</th>
                <th className={th}>Target</th>
                <th className={th} title="Target against the spot the session was computed at.">
                  Δ
                </th>
                <th className={th} title="The session the forecast was for — the next trading day — and its close.">
                  Settled
                </th>
                <th className={cn(th, tl)}>Result</th>
              </tr>
            </thead>
            <tbody>
              {days.map((d) => {
                const s = d.session
                const stl = d.settlement
                const move = s.spot > 0 ? ((s.expected_close - s.spot) / s.spot) * 100 : null
                const current = isForecastSettlement(stl)
                const target = current ? settlementTarget(stl) : null
                const fault = current ? settlementInputFault(stl) : null
                const res = current
                  ? fault
                    ? { txt: 'input fault', cls: 'text-warning', title: `${INPUT_FAULT_NOTE} Close ${signedPct(stl.close_miss_pct)} off the target.` }
                    : stl.path_hit
                    ? {
                        txt: 'hit',
                        cls: 'text-success',
                        title: settlementBasis(stl) === 'hourly'
                          ? `Path held on ${stl.path_hit_count} of ${stl.path_total} hours and the close came within 1% of the target.`
                          : 'The close came within 1% of the target (no hourly bars for this name that day).',
                      }
                    : {
                        txt: `miss ${signedPct(stl.close_miss_pct)}`,
                        cls: 'text-destructive',
                        title: settlementBasis(stl) === 'hourly'
                          ? `Path held on ${stl.path_hit_count} of ${stl.path_total} hours; close ${signedPct(stl.close_miss_pct)} off the target.`
                          : `Close ${signedPct(stl.close_miss_pct)} off the target (no hourly bars for this name that day).`,
                      }
                  : stl != null
                    ? { txt: 'old rule', cls: 'text-muted-foreground', title: LEGACY_SETTLEMENT_NOTE }
                    : d.trade_date > newestSettled
                      ? { txt: 'pending', cls: 'text-muted-foreground', title: 'Settles after the next session closes.' }
                      : {
                          txt: 'not settled',
                          cls: 'text-warning',
                          title: 'The session it forecast has no close in the store (a closed day, or a gap).',
                        }
                const open = openId === s.session_id
                return (
                  <tr
                    key={d.trade_date}
                    className={cn('cursor-pointer hover:bg-secondary/40', open && 'bg-secondary/60')}
                    onClick={() => setOpen(open ? null : s.session_id)}
                  >
                    <td className={cn(td, tl)}>
                      <button
                        type="button"
                        className="text-[var(--sk-soft)] hover:underline"
                        aria-expanded={open}
                        title="Open the session — hourly path, structures, the model’s own words"
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpen(open ? null : s.session_id)
                        }}
                      >
                        {d.trade_date.slice(5)}
                      </button>
                    </td>
                    <td className={cn(td, tl, 'font-sans text-[var(--sk-soft)]')}>{s.regime || '—'}</td>
                    <td className={td}>{s.spot.toFixed(2)}</td>
                    <td className={cn(td, fault && 'text-warning')}>{s.expected_close.toFixed(2)}</td>
                    <td className={cn(td, move == null ? 'text-muted-foreground' : move >= 0 ? 'text-profit' : 'text-loss')}>
                      {move != null ? `${move >= 0 ? '+' : '−'}${Math.abs(move).toFixed(1)}%` : '—'}
                    </td>
                    <td className={cn(td, 'text-muted-foreground')}>
                      {current && target ? (
                        <>
                          {target.slice(5)} <span className="text-foreground">{stl.actual_close.toFixed(2)}</span>
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className={cn(td, tl, 'font-sans', res.cls)} title={res.title}>
                      {res.txt}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="border-t border-[var(--sk-line0)] px-3 py-2">
        <div className="flex items-baseline gap-2">
          <span className={cap}>Calibration by regime · 180d</span>
          <span className="ml-auto text-dense-micro text-muted-foreground">hit against the probability each session claimed</span>
        </div>
        {(calQ.data?.overall.input_faults ?? 0) > 0 ? (
          <p className="m-0 pt-0.5 text-dense-caption text-muted-foreground text-pretty">
            {calQ.data?.overall.input_faults} settled session{calQ.data?.overall.input_faults === 1 ? '' : 's'} left out —
            targets drawn from GEX walls nowhere near the price.
          </p>
        ) : null}
        {calQ.isLoading ? (
          <p className="m-0 py-1 text-dense-meta text-muted-foreground">Loading calibration…</p>
        ) : cal.length === 0 ? (
          <p className="m-0 py-1 text-dense-meta text-muted-foreground">No settled session on this name in 180 days.</p>
        ) : (
          <table className="mt-1 w-full border-collapse">
            <thead>
              <tr>
                <th className={cn(th, tl, 'static bg-transparent')}>Regime</th>
                <th className={cn(th, 'static bg-transparent')}>n</th>
                <th className={cn(th, 'static bg-transparent')}>Hit</th>
                <th className={cn(th, 'static bg-transparent')}>Claimed</th>
                <th className={cn(th, 'static bg-transparent')} title="hit − claimed: + the model was under-confident, − over-confident">
                  Gap
                </th>
                <th className={cn(th, 'static bg-transparent')}>Avg |miss|</th>
              </tr>
            </thead>
            <tbody>
              {cal.map((r) => (
                <tr key={r.regime}>
                  <td className={cn(td, tl, 'font-sans text-[var(--sk-soft)]')}>{r.regime}</td>
                  <td className={cn(td, r.n < 10 ? 'text-warning' : undefined)} title={r.n < 10 ? 'Under 10 sessions — a thin sample.' : undefined}>
                    {r.n}
                  </td>
                  <td className={td}>{pctOf(r.hit_rate)}</td>
                  <td className={td}>{pctOf(r.avg_top_prob)}</td>
                  <td
                    className={cn(
                      td,
                      r.calibration_gap == null
                        ? 'text-muted-foreground'
                        : r.calibration_gap < -0.1
                          ? 'text-destructive'
                          : r.calibration_gap > 0.1
                            ? 'text-success'
                            : undefined,
                    )}
                  >
                    {r.calibration_gap == null ? '—' : `${r.calibration_gap >= 0 ? '+' : '−'}${Math.abs(r.calibration_gap * 100).toFixed(0)} pts`}
                  </td>
                  <td className={td}>{pctOf(r.avg_close_miss_pct, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="m-0 border-t border-[var(--sk-line0)] px-3 py-2 text-dense-caption leading-relaxed text-muted-foreground text-pretty">
        Trust a path only after its hit-rate has earned it. Each forecast is settled against the session it
        was for; where the store has no hourly bars for the name, the path is judged on the close alone.
        {legacy > 0 ? ` ${legacy} row${legacy === 1 ? '' : 's'} still carry the old rule and are not counted.` : ''}
        {faults > 0
          ? ` ${faults} row${faults === 1 ? ' was' : 's were'} drawn from GEX walls nowhere near the price and ${faults === 1 ? 'is' : 'are'} not counted.`
          : ''}
        {reruns > 0 ? ` ${reruns} later re-run${reruns === 1 ? '' : 's'} of the same dates are folded into their rows.` : ''}
      </p>
      <RightInspectorShell open={openDay != null} ariaLabel="Forecast session" onClose={() => setOpen(null)}>
        {openDay ? <SymbolSessionInspector day={openDay} onClose={() => setOpen(null)} /> : null}
      </RightInspectorShell>
    </section>
  )
}
