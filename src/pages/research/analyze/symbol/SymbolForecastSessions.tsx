/**
 * Forecast sessions — how the paths settled (design `Research Symbol.dc.html`,
 * §isScenario, second panel).
 *
 * One row per trade date on this name over 30 days — re-runs of a date are
 * folded (`useSymbolForecastSessions`) — and each row opens the session in the
 * inspector: what the model said, hour by hour, and the structures it ranked.
 *
 * The settlement figures keep their seats but print no number: the settlement
 * scores each session against the close that was already known when it was
 * computed, so a hit rate here would measure hindsight (DESIGN_CONTRACTS
 * §15.8 — a bug is fixed, and until then its reading is withheld with the
 * reason, not dressed as a result).
 */
import { useSearchParams } from 'react-router-dom'
import { RightInspectorShell } from '@/components/layout/RightInspectorShell'
import { cn } from '@/lib/utils'
import { SymbolSessionInspector } from './SymbolSessionInspector'
import { SETTLEMENT_WITHHELD_REASON, useSymbolForecastSessions } from './useSymbolForecastSessions'

const cap =
  'whitespace-nowrap text-dense-caption font-semibold uppercase tracking-[0.1em] text-muted-foreground'
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

export function SymbolForecastSessions({ symbol }: { symbol: string }) {
  const sym = symbol.trim().toUpperCase()
  const { days: allDays, isLoading } = useSymbolForecastSessions(sym)
  const since = daysAgoIso(WINDOW_DAYS)
  const days = allDays.filter((d) => d.trade_date >= since)
  const newestSettled = days.find((d) => d.settlement != null)?.trade_date ?? ''
  const nSettled = days.filter((d) => d.settlement != null).length
  const pending = days.filter((d) => d.settlement == null && d.trade_date > newestSettled).length
  const neverSettled = days.length - nSettled - pending
  const reruns = days.reduce((a, d) => a + d.reruns, 0)

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

  return (
    <section className={panel}>
      <header className={panelHead}>
        <span className={cap}>Forecast sessions</span>
        <span className="text-dense-body font-semibold">how the paths settled</span>
        <span className="ml-auto text-dense-caption text-muted-foreground">
          {WINDOW_DAYS}d hit{' '}
          <b className={cn(mono, 'text-muted-foreground')} title={SETTLEMENT_WITHHELD_REASON}>
            withheld
          </b>{' '}
          · settled <b className={cn(mono, 'text-foreground')}>{nSettled}</b> · pending{' '}
          <b className={cn(mono, 'text-foreground')}>{pending}</b>
          {neverSettled > 0 ? (
            <>
              {' '}
              · not settled <b className={cn(mono, 'text-foreground')}>{neverSettled}</b>
            </>
          ) : null}
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
                <th className={th}>Horizon</th>
                <th className={cn(th, tl)}>Result</th>
              </tr>
            </thead>
            <tbody>
              {days.map((d) => {
                const s = d.session
                const move = s.spot > 0 ? ((s.expected_close - s.spot) / s.spot) * 100 : null
                const res =
                  d.settlement != null
                    ? { txt: 'settled · withheld', cls: 'text-muted-foreground', title: SETTLEMENT_WITHHELD_REASON }
                    : d.trade_date > newestSettled
                      ? { txt: 'pending', cls: 'text-muted-foreground', title: 'Settles after its session closes.' }
                      : {
                          txt: 'not settled',
                          cls: 'text-warning',
                          title: 'Older than the newest settlement and never settled.',
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
                    <td className={td}>{s.expected_close.toFixed(2)}</td>
                    <td className={cn(td, move == null ? 'text-muted-foreground' : move >= 0 ? 'text-profit' : 'text-loss')}>
                      {move != null ? `${move >= 0 ? '+' : '−'}${Math.abs(move).toFixed(1)}%` : '—'}
                    </td>
                    <td
                      className={cn(td, 'text-muted-foreground')}
                      title="Every session forecasts a single close — a one-day horizon by construction."
                    >
                      1d
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
      <p className="m-0 border-t border-[var(--sk-line0)] px-3 py-2 text-dense-caption leading-relaxed text-muted-foreground text-pretty">
        Trust a path only after its hit-rate has earned it. The hit rate, the miss and the
        calibration by regime wait on a settlement fix: each forecast is currently scored against
        the close that was already known when it was computed.
        {reruns > 0 ? ` ${reruns} later re-run${reruns === 1 ? '' : 's'} of the same dates are folded into their rows.` : ''}
      </p>
      <RightInspectorShell open={openDay != null} ariaLabel="Forecast session" onClose={() => setOpen(null)}>
        {openDay ? <SymbolSessionInspector day={openDay} onClose={() => setOpen(null)} /> : null}
      </RightInspectorShell>
    </section>
  )
}
