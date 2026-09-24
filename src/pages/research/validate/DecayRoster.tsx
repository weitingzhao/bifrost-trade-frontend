/**
 * The design's lead: every signal, worst drift first, with its alerts above.
 *
 * `decayRosterModel.ts` decides what the rows say; this draws them. The page below
 * this is the per-lens instrument that was already here — a lens picker, a
 * window, a regime, the hot/cold matrix. It answers *how is this one signal
 * doing*; the design's page asks *which of them is slipping*, which is a
 * question no amount of picking one at a time will answer.
 */
import { Link } from 'react-router-dom'
import { DenseTag } from '@/components/data-display'
import { Skeleton } from '@/components/ui/skeleton'
import { fmtPctFromFraction } from '@/lib/format'
import { cn } from '@/lib/utils'
import { THIN_N, type DecayAlert, type DecayRow } from './decayRosterModel'

function Spark({ bars }: { bars: DecayRow['bars'] }) {
  if (bars.length === 0) {
    return <span className="text-dense-caption text-muted-foreground">no weekly history</span>
  }
  return (
    <span className="inline-flex h-[18px] items-end gap-px">
      {bars.map((b, i) => (
        <span
          key={i}
          title={b.label}
          className={cn(
            'inline-block w-[5px] rounded-t-[1px]',
            b.value == null ? 'bg-secondary' : b.weak ? 'bg-warning' : 'bg-border',
          )}
          style={{ height: b.value == null ? 4 : Math.max(3, Math.round(b.value * 18)) }}
        />
      ))}
    </span>
  )
}

export function DecayRoster({
  rows,
  alerts,
  loading,
}: {
  rows: readonly DecayRow[]
  alerts: readonly DecayAlert[]
  loading: boolean
}) {
  if (loading && rows.length === 0) return <Skeleton className="h-48 rounded-lg" />

  return (
    <div className="space-y-3">
      {alerts.length > 0 ? (
        <section className="overflow-hidden rounded-lg border border-warning/45">
          <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-warning/30 bg-warning/[0.06] px-3 py-2">
            <span className="text-dense-micro font-bold uppercase tracking-[0.12em] text-warning">
              Decay alerts
            </span>
            <span className="text-dense-body font-semibold">{alerts.length} active</span>
            {/* The design says an alert zeroes the conviction cap in Compare.
                Compare's conviction reads the structure's closed record, not a
                lens's decay, so no page acts on an alert yet — and the
                sentence says that rather than implying one does. */}
            <span className="ml-auto text-dense-caption text-muted-foreground">
              the design cuts the conviction cap while one of these is open — no page on this side
              reads it yet
            </span>
          </header>
          {alerts.map((a) => (
            <div
              key={a.key}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border/50 px-3 py-2 last:border-b-0"
            >
              <span className="size-2 shrink-0 rounded-full bg-warning" aria-hidden />
              <span className="text-dense-body font-semibold">{a.name}</span>
              <span className="min-w-0 flex-1 text-dense-meta text-foreground/80">{a.why}</span>
              <Link
                to="/review/playbook-stats"
                className="text-dense-caption text-primary hover:underline"
              >
                Evidence →
              </Link>
            </div>
          ))}
        </section>
      ) : null}

      <section className="overflow-hidden rounded-lg border border-border">
        <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border bg-secondary/40 px-3 py-2">
          <span className="text-dense-micro font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Signals
          </span>
          <span className="text-dense-body font-semibold">
            {rows.length} tracked · 20d hit rate, 90 days against its own year
          </span>
          <span className="ml-auto text-dense-caption text-muted-foreground">
            grey week = n &lt; 10, not a bad week · settled outcomes only
          </span>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                {['Signal', 'Lens', 'Hit 20d', 'vs its year', '6-month trend', 'n settled', 'Read'].map(
                  (h, i) => (
                    <th
                      key={h}
                      className={cn(
                        'whitespace-nowrap px-2.5 py-1.5 text-dense-micro font-semibold uppercase tracking-[0.06em] text-muted-foreground',
                        i === 2 || i === 3 || i === 5 ? 'text-right' : 'text-left',
                      )}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.key}
                  className={cn('border-b border-border/50', r.decaying && 'bg-warning/[0.04]')}
                >
                  <td className="whitespace-nowrap px-2.5 py-1.5 text-dense-meta font-medium">
                    {r.name}
                  </td>
                  <td className="whitespace-nowrap px-2.5 py-1.5 text-dense-caption text-muted-foreground">
                    {r.lensLabel}
                  </td>
                  <td
                    className={cn(
                      'whitespace-nowrap px-2.5 py-1.5 text-right font-mono text-dense-meta font-semibold tabular-nums',
                      r.decaying && 'text-warning',
                    )}
                  >
                    {fmtPctFromFraction(r.hit, 0)}
                  </td>
                  <td
                    className={cn(
                      'whitespace-nowrap px-2.5 py-1.5 text-right font-mono text-dense-meta tabular-nums',
                      r.driftPts == null
                        ? 'text-muted-foreground'
                        : r.driftPts <= -5
                          ? 'text-warning'
                          : r.driftPts >= 3
                            ? 'text-success'
                            : 'text-muted-foreground',
                    )}
                    title={r.avg == null ? undefined : `its 1-year average is ${fmtPctFromFraction(r.avg, 0)}`}
                  >
                    {r.driftPts == null
                      ? '—'
                      : `${r.driftPts >= 0 ? '+' : '−'}${Math.abs(r.driftPts)} pts`}
                  </td>
                  <td className="px-2.5 py-1.5">
                    <Spark bars={r.bars} />
                  </td>
                  <td
                    className={cn(
                      'whitespace-nowrap px-2.5 py-1.5 text-right font-mono text-dense-meta tabular-nums',
                      r.n < THIN_N ? 'text-warning' : 'text-muted-foreground',
                    )}
                  >
                    {r.n}
                  </td>
                  <td className="min-w-[24ch] px-2.5 py-1.5 text-dense-caption leading-relaxed text-muted-foreground">
                    {r.read}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-border px-3 py-2 text-dense-caption leading-relaxed text-muted-foreground">
          Hit = the lens&rsquo;s 20-day directional read that settled in the money.{' '}
          <span className="text-foreground/80">
            Decay is judged against each signal&rsquo;s own 1-year average, not against other
            signals
          </span>{' '}
          — a 55% signal drifting to 40% is decaying; a 45% signal holding 45% is not. The trend
          bars are the engine&rsquo;s weekly <span className="font-mono">5d</span> rolling rate,
          which is the only series it keeps; <span className="font-mono">Profit factor</span> is
          owed — the response carries hit rates and no payoff.{' '}
          <DenseTag variant="neutral" size="cell">
            owed
          </DenseTag>
        </p>
      </section>
    </div>
  )
}
