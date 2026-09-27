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
import { ViewState } from '@bifrost/ui'
import { fmtPctFromFraction } from '@/lib/format'
import { cn } from '@/lib/utils'
import { THIN_N, type DecayAlert, type DecayRow } from '@/utils/decayRosterModel'

/** Rev .88: the alerts panel's edge — amber at 45%, as the prototype draws it. */
const ALERT_EDGE = 'color-mix(in srgb, var(--color-warning) 45%, transparent)'

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
            b.value == null
              ? 'bg-[color-mix(in_srgb,var(--sk-ink)_8%,transparent)]'
              : b.weak
                ? 'bg-warning'
                : 'bg-[var(--sk-line2)]',
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
  if (loading && rows.length === 0) {
    return (
      <section className="overflow-hidden mat-card">
        <ViewState kind="loading" title="Loading signal decay" rows={8} cols={6} />
      </section>
    )
  }

  return (
    <div className="space-y-3">
      {alerts.length > 0 ? (
        // The severity is the edge (Rev .88) — inline, because `mat-card`
        // clears any border-colour class.
        <section className="overflow-hidden border mat-card" style={{ borderColor: ALERT_EDGE }}>
          <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border px-3 py-2">
            <span className="text-dense-meta font-semibold text-warning">Decay alerts</span>
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
              className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-3 py-2 last:border-b-0"
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

      <section className="overflow-hidden mat-card">
        <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border px-3 py-2">
          <span className="text-dense-meta font-semibold text-muted-foreground">Signals</span>
          <span className="text-dense-body font-semibold">
            {rows.length} tracked · 20d hit rate, 90 days against its own year
          </span>
          <span className="ml-auto text-dense-caption text-muted-foreground">
            grey week = n &lt; 10, not a bad week · settled outcomes only
          </span>
        </header>
        <div className="overflow-x-auto">
          <table data-sr-table="" className="w-full">
            <thead>
              <tr>
                <th data-sr-col="entity">Signal</th>
                <th data-sr-col="tag">Lens</th>
                <th data-sr-col="num">Hit 20d</th>
                <th data-sr-col="num">vs its year</th>
                <th data-sr-col="tag">6-month trend</th>
                <th data-sr-col="num">n settled</th>
                <th data-sr-col="wrap">Read</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.key}
                  className={cn(
                    'hover:[&>td]:bg-[color-mix(in_srgb,var(--sk-ink)_4%,transparent)]',
                    r.decaying && 'bg-[color-mix(in_srgb,var(--color-warning)_4%,transparent)]',
                  )}
                >
                  <td data-sr-col="entity" className="text-dense-meta font-medium">
                    {r.name}
                  </td>
                  <td data-sr-col="tag" className="text-dense-caption text-muted-foreground">
                    {r.lensLabel}
                  </td>
                  <td
                    data-sr-col="num"
                    className={cn('font-semibold', r.decaying && 'text-warning')}
                  >
                    {fmtPctFromFraction(r.hit, 0)}
                  </td>
                  <td
                    data-sr-col="num"
                    className={cn(
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
                  <td data-sr-col="tag">
                    <Spark bars={r.bars} />
                  </td>
                  <td
                    data-sr-col="num"
                    className={r.n < THIN_N ? 'text-warning' : 'text-muted-foreground'}
                  >
                    {r.n}
                  </td>
                  <td
                    data-sr-col="wrap"
                    className="min-w-[24ch] whitespace-normal text-dense-caption leading-relaxed text-muted-foreground"
                  >
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
          which is the only series it keeps. <span className="font-mono">Profit factor</span> is
          not summed yet: every settled row carries its forward return and each lens&rsquo;s hit
          rule has a direction, but the endpoint returns hit rates only.{' '}
          <DenseTag variant="neutral" size="cell">
            not built
          </DenseTag>
        </p>
      </section>
    </div>
  )
}
