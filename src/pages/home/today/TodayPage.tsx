/**
 * Today — the action surface, and the only page that belongs to no layer.
 *
 * It cuts across all five by time of day, because no segment of the day lives
 * inside one layer. Every row is a thing to do and carries a link into the
 * layer that owns the figure behind it; nothing here mirrors a number that
 * already has a home.
 *
 * What the design's empty state asserts, this page splits in two: questions
 * that were asked and came back clean, and questions nothing on this side can
 * ask. Printing "no overnight stop breach" when no plan has ever been linked to
 * a position would be a claim, not a reading. The reasons live in one Blind
 * spots panel rather than under every segment, so the rows stay the page and
 * the caveats stay findable.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { PageHeader, PageShell } from '@/components/layout'
import { DenseTag, SegmentControl } from '@/components/data-display'
import { StatusLamp } from '@/components/StatusLamp'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { positionsUi } from '@/components/positions/positionsUi'
import { fmtPrice, pnlColorClass } from '@/utils/dailyChange'
import { fmtIsoDateToken } from '@/lib/format'
import { PAGE_ROUTES } from '@/layout/routeRegistry'
import { useTodayChecks } from './useTodayChecks'
import {
  HOME_LAYERS,
  HOME_NOT_HERE,
  allRows,
  countByUrgency,
  segmentViews,
  sessionLabel,
  sessionSegment,
  type HomeSegment,
  type HomeUrgency,
} from './todayModel'

const PAGE_LEAD =
  'The action surface. It belongs to no layer and is organised by time of day, because no segment of the day lives inside one layer.'

const FOOT =
  'border-t border-border bg-[var(--sk-raised2)] px-3 py-1.5 text-dense-meta leading-normal text-muted-foreground text-pretty'

const URGENCY: Record<HomeUrgency, { label: string; ink: string }> = {
  now: { label: 'NOW', ink: 'text-lamp-red' },
  soon: { label: 'SOON', ink: 'text-warning' },
  today: { label: 'TODAY', ink: 'text-muted-foreground' },
}

/** The page a row lands on, named — "Risk  Limits & Breaches →" reads as the design's does. */
function destinationLabel(to: string): string | null {
  return PAGE_ROUTES.find((r) => r.path === to)?.label ?? null
}

function fmtChangePct(v: number | null): string {
  return v == null ? 'n/c' : `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(2)}%`
}

export default function TodayPage() {
  const [accountFilter, setAccountFilter] = useState('all')
  const [segFilter, setSegFilter] = useState<'all' | HomeSegment>('all')
  const { checks, tape, today, accountIds, loading, error, exposure } = useTodayChecks(accountFilter)

  /**
   * The clock, read once and in the market's own zone.
   *
   * A render must not watch a moving hand, and the session this page organises
   * itself by is New York's — a machine in another zone would otherwise be told
   * the wrong part of the day.
   */
  const [clock] = useState(() =>
    new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'America/New_York',
    }),
  )
  const nowSeg = sessionSegment(clock)

  const views = useMemo(() => segmentViews(checks, nowSeg), [checks, nowSeg])
  const shown = useMemo(
    () => (segFilter === 'all' ? views : views.filter((v) => v.seg === segFilter)),
    [views, segFilter],
  )
  const rows = useMemo(() => allRows(checks), [checks])
  const due = useMemo(() => countByUrgency(rows), [rows])
  const blind = useMemo(() => checks.filter((c) => c.cannotRun != null), [checks])
  const partial = useMemo(() => checks.filter((c) => c.cannotRun == null && c.partial != null), [checks])
  const layersTouched = new Set(rows.map((r) => r.layer)).size

  return (
    <PageShell padding="compact" className="space-y-3">
      <section className={positionsUi.pageCard} aria-label="Today">
        <PageHeader
          breadcrumb={<p className="text-xs text-primary/90 font-medium">Today</p>}
          title="Today"
          titleSize="large"
          description={`${PAGE_LEAD} ${rows.length} open ${rows.length === 1 ? 'item' : 'items'} across ${layersTouched} ${
            layersTouched === 1 ? 'layer' : 'layers'
          }, each with a deep link into the one that owns it.`}
          actions={
            <SegmentControl
              size="xs"
              ariaLabel="Part of the day"
              value={segFilter}
              onChange={(v) => setSegFilter(v as 'all' | HomeSegment)}
              options={[
                { value: 'all', label: 'All day' },
                { value: 'pre', label: 'Pre-open' },
                { value: 'rth', label: 'Intraday' },
                { value: 'close', label: 'Pre-close' },
              ]}
            />
          }
        />

        {error ? <QueryErrorAlert error={error} onRetry={() => void exposure.betaQuery.refetch()} /> : null}
        {loading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-12 w-full rounded-md" />
            <Skeleton className="h-24 w-full rounded-md" />
            <Skeleton className="h-48 w-full rounded-md" />
          </div>
        ) : (
          <>
            <section
              className={cn(positionsUi.panel, 'flex flex-wrap items-center gap-x-4 gap-y-1.5 px-3 py-2')}
              aria-label="Now"
            >
              <span className={positionsUi.cap}>Now</span>
              <span className={cn(positionsUi.mono, 'text-sm text-foreground')}>{clock} ET</span>
              <span className={cn(positionsUi.mono, 'text-dense-meta text-muted-foreground')}>
                {sessionLabel(clock)}
              </span>
              <span className="h-3.5 w-px bg-[var(--sk-line2)]" aria-hidden />
              <span className="inline-flex items-center gap-2.5 text-dense-meta">
                <span className={cn(positionsUi.mono, due.now > 0 ? 'text-lamp-red' : 'text-muted-foreground')}>
                  {due.now} due now
                </span>
                <span className={cn(positionsUi.mono, due.soon > 0 ? 'text-warning' : 'text-muted-foreground')}>
                  {due.soon} soon
                </span>
                <span className={cn(positionsUi.mono, 'text-muted-foreground')}>{due.today} later today</span>
              </span>
              <span className="ml-auto inline-flex items-center gap-2.5">
                <span className={cn(positionsUi.mono, 'text-dense-meta text-muted-foreground')}>
                  {fmtIsoDateToken(today)}
                </span>
                {accountIds.length > 1 ? (
                  <SegmentControl
                    size="xs"
                    ariaLabel="Account"
                    value={accountFilter}
                    onChange={setAccountFilter}
                    options={[{ value: 'all', label: 'All accounts' }, ...accountIds.map((a) => ({ value: a, label: a }))]}
                  />
                ) : null}
              </span>
            </section>

            <section className={positionsUi.panel} aria-label="Tape">
              <header className={positionsUi.panelHead}>
                <span className={positionsUi.cap}>Tape</span>
                <span className={positionsUi.panelTitle}>ambient, not a destination</span>
                <span className="ml-auto text-dense-meta text-muted-foreground">
                  the benchmark β is measured against, and the names carrying the most exposure
                </span>
              </header>
              <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1.5 px-3 py-2">
                {tape.map((t) => (
                  <span key={t.symbol} className="inline-flex items-baseline gap-1.5">
                    <span className={cn(positionsUi.mono, 'font-bold text-entity-option')}>{t.symbol}</span>
                    <span className={cn(positionsUi.mono, 'text-sm text-foreground')}>{fmtPrice(t.last)}</span>
                    <span className={cn(positionsUi.mono, 'text-dense-meta', pnlColorClass(t.changePct))}>
                      {fmtChangePct(t.changePct)}
                    </span>
                    <span className="text-dense-meta text-muted-foreground">{t.note}</span>
                  </span>
                ))}
              </div>
              {tape.every((t) => t.last == null) ? (
                <p className={cn(FOOT, 'm-0')}>
                  The quote cache is empty, which it is outside the session — these are the names the tape watches, with
                  no live price behind them. A stale last printed as though it were live is the one thing a glance
                  cannot afford.
                </p>
              ) : null}
            </section>

            {shown.map((v) => (
              <section
                key={v.seg}
                className={cn(positionsUi.panel, v.isNow && 'border-primary/45')}
                aria-label={v.title}
              >
                <header className={positionsUi.panelHead}>
                  <span className={cn(positionsUi.cap, v.isNow && 'text-primary')}>{v.window}</span>
                  <span className={positionsUi.panelTitle}>{v.title}</span>
                  <span className={cn(positionsUi.mono, 'text-dense-meta text-muted-foreground')}>
                    {v.rows.length} {v.rows.length === 1 ? 'item' : 'items'}
                  </span>
                  {v.isNow ? (
                    <DenseTag variant="success" size="cell">
                      NOW
                    </DenseTag>
                  ) : null}
                  <span className="ml-auto text-dense-meta text-muted-foreground">{v.note}</span>
                </header>

                {v.rows.length === 0 ? (
                  <p className="m-0 px-3 py-2.5 text-dense-meta leading-normal text-muted-foreground text-pretty">
                    {v.clean.length + v.partial.length === 0
                      ? 'Nothing in this part of the day can be checked yet.'
                      : `Nothing to do here. ${v.clean.length + v.partial.length} of ${
                          v.clean.length + v.partial.length + v.blind.length
                        } questions were asked and came back clean.`}
                  </p>
                ) : (
                  v.rows.map((r) => (
                    <Link
                      key={r.key}
                      to={r.to}
                      className={cn(
                        'grid grid-cols-[0.5rem_3.5rem_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-0.5',
                        'border-b border-border/55 px-3 py-2.5 no-underline last:border-b-0',
                        'hover:bg-[var(--sk-raised2)]',
                      )}
                    >
                      <span
                        className={cn('mt-1.5 h-2 w-2 rounded-[2px] bg-current', HOME_LAYERS[r.layer].ink)}
                        aria-hidden
                      />
                      <span
                        className={cn(
                          positionsUi.mono,
                          'mt-0.5 text-dense-caption font-bold tracking-[0.06em]',
                          URGENCY[r.urg].ink,
                        )}
                      >
                        {URGENCY[r.urg].label}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm leading-normal font-semibold text-foreground text-pretty">
                          {r.what}
                        </span>
                        <span className="block text-dense-meta leading-normal text-muted-foreground text-pretty">
                          {r.why}
                        </span>
                      </span>
                      <span className="mt-0.5 inline-flex items-baseline gap-1.5 whitespace-nowrap text-dense-meta">
                        <span className={cn(positionsUi.mono, HOME_LAYERS[r.layer].ink)}>
                          {HOME_LAYERS[r.layer].label}
                        </span>
                        <span className="text-secondary-foreground">{destinationLabel(r.to) ?? 'open'} →</span>
                      </span>
                    </Link>
                  ))
                )}

                {v.clean.length + v.partial.length + v.blind.length > 0 ? (
                  <p className={cn(FOOT, 'm-0 flex flex-wrap items-center gap-x-3')}>
                    {v.clean.length > 0 ? (
                      <span className="inline-flex items-center gap-1.5">
                        <StatusLamp lamp="green" variant="dot" title="Asked and clean" />
                        {v.clean.length} asked, nothing there
                      </span>
                    ) : null}
                    {v.partial.length > 0 ? (
                      <span className="inline-flex items-center gap-1.5 text-warning">
                        <StatusLamp lamp="yellow" variant="dot" title="Answered in part" />
                        {v.partial.length} answered for part of the book
                      </span>
                    ) : null}
                    {v.blind.length > 0 ? (
                      <span className="inline-flex items-center gap-1.5">
                        <StatusLamp lamp="gray" variant="dot" title="Cannot be asked" />
                        {v.blind.length} cannot be asked — listed below
                      </span>
                    ) : null}
                  </p>
                ) : null}
              </section>
            ))}

            <section className={cn(positionsUi.panel, 'border-warning/40')} aria-label="Blind spots">
              <header className={positionsUi.panelHead}>
                <span className={positionsUi.cap}>Blind spots</span>
                <span className={positionsUi.panelTitle}>
                  {blind.length} of {checks.length} questions cannot be asked
                </span>
                <DenseTag variant="warning" size="cell">
                  ⚠ absence of a row is not absence of a problem
                </DenseTag>
                <span className="ml-auto text-dense-meta text-muted-foreground">
                  a quiet page means the {checks.length - blind.length} that can be asked came back clean
                </span>
              </header>
              {blind.map((c) => (
                <div
                  key={c.key}
                  className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 border-b border-border/55 px-3 py-1.75 last:border-b-0"
                >
                  <span className="inline-flex items-center gap-1.5 text-xs leading-normal text-secondary-foreground">
                    <StatusLamp lamp="gray" variant="dot" title="Cannot be asked" />
                    {c.question}
                  </span>
                  <span className="min-w-0 flex-[1_1_16rem] text-dense-meta leading-normal text-muted-foreground text-pretty">
                    {c.cannotRun}
                  </span>
                  <Link to={c.to} className={positionsUi.link}>
                    {HOME_LAYERS[c.layer].label} →
                  </Link>
                </div>
              ))}
              {partial.map((c) => (
                <div
                  key={c.key}
                  className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 border-b border-border/55 px-3 py-1.75 last:border-b-0"
                >
                  <span className="inline-flex items-center gap-1.5 text-xs leading-normal text-warning">
                    <StatusLamp lamp="yellow" variant="dot" title="Answered in part" />
                    {c.question}
                  </span>
                  <span className="min-w-0 flex-[1_1_16rem] text-dense-meta leading-normal text-muted-foreground text-pretty">
                    answered for part of the book only — {c.partial}
                  </span>
                  <Link to={c.to} className={positionsUi.link}>
                    {HOME_LAYERS[c.layer].label} →
                  </Link>
                </div>
              ))}
              <p className={cn(FOOT, 'm-0')}>
                Most of them close together: a daily snapshot answers the overnight questions, and a plan that reaches a
                position answers the stop and the planned exit.
              </p>
            </section>

            <section className={positionsUi.panel} aria-label="Not here">
              <header className={positionsUi.panelHead}>
                <span className={positionsUi.cap}>Not here</span>
                <span className={positionsUi.panelTitle}>what this page deliberately is not</span>
              </header>
              <p className="m-0 px-3 py-2.5 text-dense-meta leading-normal text-muted-foreground text-pretty">
                {HOME_NOT_HERE}
              </p>
            </section>
          </>
        )}
      </section>
    </PageShell>
  )
}
