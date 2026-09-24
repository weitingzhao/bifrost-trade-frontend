/**
 * Forecast sessions — how the paths settled (design `Research Symbol.dc.html`,
 * §isScenario, second panel).
 *
 * One row per forecast session on this name, joined to its settlement by
 * `session_id`. A session still inside its horizon is pending, not a miss —
 * the design's own note, and the join makes it structural: the three header
 * counts are disjoint by construction.
 */
import { useQuery } from '@tanstack/react-query'
import { fetchForecastSessions, fetchSettlements } from '@/api/researchEngine'
import { cn } from '@/lib/utils'

const cap =
  'whitespace-nowrap text-dense-caption font-semibold uppercase tracking-[0.1em] text-muted-foreground'
const mono = 'font-mono tabular-nums'
const panel =
  'min-w-0 rounded-[10px] border border-[var(--sk-line0)] bg-[var(--sk-raised)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--sk-ink)_4%,transparent)]'
const panelHead =
  'flex flex-wrap items-center gap-2.5 rounded-t-[9px] border-b border-[var(--sk-line0)] bg-[var(--sk-raised2)] px-3 py-1.75 text-dense-body leading-normal'
const th =
  'whitespace-nowrap border-b border-border px-2 py-1 text-right align-bottom text-dense-caption font-semibold text-secondary-foreground'
const td = 'whitespace-nowrap border-b border-border/40 px-2 py-1 text-right font-mono text-dense-meta tabular-nums'
const tl = 'text-left'

const daysAgoIso = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10)

export function SymbolForecastSessions({ symbol }: { symbol: string }) {
  const sym = symbol.trim().toUpperCase()
  const sessQ = useQuery({
    queryKey: ['research', 'forecast-sessions', sym],
    queryFn: () => fetchForecastSessions(sym),
    enabled: Boolean(sym),
    staleTime: 5 * 60_000,
  })
  const settQ = useQuery({
    queryKey: ['research', 'forecast-settlements', sym],
    queryFn: () => fetchSettlements(sym, undefined, 200),
    enabled: Boolean(sym),
    staleTime: 5 * 60_000,
  })

  const since = daysAgoIso(30)
  const sessions = (sessQ.data?.rows ?? [])
    .filter((s) => s.trade_date >= since)
    .sort((a, b) => b.trade_date.localeCompare(a.trade_date))
  const settled = new Map((settQ.data?.rows ?? []).map((r) => [r.session_id, r]))

  const hit = sessions.filter((s) => settled.get(s.session_id)?.path_hit === true).length
  const miss = sessions.filter((s) => settled.get(s.session_id)?.path_hit === false).length
  const pending = sessions.length - hit - miss
  const nSettled = hit + miss

  return (
    <section className={panel}>
      <header className={panelHead}>
        <span className={cap}>Forecast sessions</span>
        <span className="text-dense-body font-semibold">how the paths settled</span>
        <span className="ml-auto text-dense-caption text-muted-foreground">
          30d hit{' '}
          <b className={cn(mono, 'text-foreground')}>
            {nSettled > 0 ? `${Math.round((hit / nSettled) * 100)}% (n=${nSettled})` : '—'}
          </b>{' '}
          · miss{' '}
          <b className={cn(mono, 'text-foreground')}>
            {nSettled > 0 ? `${Math.round((miss / nSettled) * 100)}%` : '—'}
          </b>{' '}
          · pending {pending}
        </span>
      </header>
      {sessions.length === 0 ? (
        <p className="m-0 px-3 py-4 text-dense-meta text-muted-foreground">
          {sessQ.isLoading
            ? 'Loading sessions…'
            : 'No forecast sessions on this name in the last 30 days.'}
        </p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={cn(th, tl)}>Session</th>
              <th className={cn(th, tl)}>Path</th>
              <th className={th}>Target</th>
              <th className={th}>Horizon</th>
              <th className={th}>Settled</th>
              <th className={cn(th, tl)}>Result</th>
            </tr>
          </thead>
          <tbody>
            {sessions.slice(0, 8).map((s) => {
              const st = settled.get(s.session_id)
              const res =
                st == null
                  ? { txt: 'pending', cls: 'text-muted-foreground' }
                  : st.path_hit
                    ? { txt: 'path hit', cls: 'text-success' }
                    : {
                        txt: `miss ${st.close_miss_pct >= 0 ? '+' : ''}${st.close_miss_pct.toFixed(1)}%`,
                        cls: 'text-destructive',
                      }
              return (
                <tr key={s.session_id}>
                  <td className={cn(td, tl, 'text-muted-foreground')}>{s.trade_date.slice(5)}</td>
                  <td className={cn(td, tl, 'font-sans text-[var(--sk-soft)]')}>{s.regime || '—'}</td>
                  <td className={td}>{s.expected_close != null ? s.expected_close.toFixed(2) : '—'}</td>
                  <td
                    className={cn(td, 'text-muted-foreground')}
                    title="Every session forecasts its own close — a one-day horizon by construction."
                  >
                    1d
                  </td>
                  <td className={td}>{st != null ? st.actual_close.toFixed(2) : '—'}</td>
                  <td className={cn(td, tl, 'font-sans', res.cls)}>{res.txt}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
      <p className="m-0 px-3 py-2 text-dense-caption leading-relaxed text-muted-foreground text-pretty">
        Trust a path only after its hit-rate has earned it. Sessions still inside their horizon are
        pending, not misses.
      </p>
    </section>
  )
}
