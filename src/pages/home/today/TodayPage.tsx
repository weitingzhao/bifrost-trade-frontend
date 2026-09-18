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
 * a position would be a claim, not a reading.
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
import { fmtIsoDateToken } from '@/lib/format'
import { useTodayChecks } from './useTodayChecks'
import {
  HOME_LAYERS,
  HOME_NOT_HERE,
  allRows,
  countByUrgency,
  segmentViews,
  sessionSegment,
  type HomeSegment,
  type HomeUrgency,
} from './todayModel'

const PAGE_LEAD =
  'What needs a decision, by the part of the day it belongs to. Every row links into the layer that owns the figure behind it — this page carries none of them itself.'

const FOOT =
  'border-t border-border bg-[var(--sk-raised2)] px-3 py-1.5 text-dense-meta leading-normal text-muted-foreground text-pretty'

const URGENCY: Record<HomeUrgency, { label: string; ink: string; lamp: 'red' | 'yellow' | 'gray' }> = {
  now: { label: 'NOW', ink: 'text-lamp-red', lamp: 'red' },
  soon: { label: 'SOON', ink: 'text-warning', lamp: 'yellow' },
  today: { label: 'TODAY', ink: 'text-muted-foreground', lamp: 'gray' },
}

export default function TodayPage() {
  const [accountFilter, setAccountFilter] = useState('all')
  const [segFilter, setSegFilter] = useState<'all' | HomeSegment>('all')
  const { checks, today, accountIds, loading, error, exposure } = useTodayChecks(accountFilter)

  /** The wall clock, read once — a render must not watch a moving hand. */
  const [clock] = useState(() =>
    new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
  )
  const nowSeg = sessionSegment(clock)

  const views = useMemo(() => segmentViews(checks, nowSeg), [checks, nowSeg])
  const shown = useMemo(
    () => (segFilter === 'all' ? views : views.filter((v) => v.seg === segFilter)),
    [views, segFilter],
  )
  const due = useMemo(() => countByUrgency(allRows(checks)), [checks])
  const blindTotal = checks.filter((c) => c.cannotRun != null).length

  return (
    <PageShell padding="compact" className="space-y-3">
      <section className={positionsUi.pageCard} aria-label="Today">
        <PageHeader
          breadcrumb={<p className="text-xs text-primary/90 font-medium">Today</p>}
          title="Today"
          titleSize="large"
          description={PAGE_LEAD}
          actions={
            <span className="flex flex-wrap items-center gap-2.5">
              <span className={cn(positionsUi.mono, 'text-dense-meta text-muted-foreground')}>
                {clock} · {fmtIsoDateToken(today)}
              </span>
              {accountIds.length > 1 ? (
                <SegmentControl
                  size="xs"
                  ariaLabel="Account"
                  value={accountFilter}
                  onChange={setAccountFilter}
                  options={[{ value: 'all', label: 'All' }, ...accountIds.map((a) => ({ value: a, label: a }))]}
                />
              ) : null}
              <SegmentControl
                size="xs"
                ariaLabel="Part of the day"
                value={segFilter}
                onChange={(v) => setSegFilter(v as 'all' | HomeSegment)}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'pre', label: 'Pre-open' },
                  { value: 'rth', label: 'Intraday' },
                  { value: 'close', label: 'Pre-close' },
                ]}
              />
              <span className="inline-flex items-center gap-2.5 text-dense-meta">
                <span className={cn(positionsUi.mono, due.now > 0 ? 'text-lamp-red' : 'text-muted-foreground')}>
                  {due.now} now
                </span>
                <span className={cn(positionsUi.mono, due.soon > 0 ? 'text-warning' : 'text-muted-foreground')}>
                  {due.soon} soon
                </span>
                <span className={cn(positionsUi.mono, 'text-muted-foreground')}>{due.today} later</span>
              </span>
            </span>
          }
        />

        {error ? <QueryErrorAlert error={error} onRetry={() => void exposure.betaQuery.refetch()} /> : null}
        {loading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-24 w-full rounded-md" />
            <Skeleton className="h-48 w-full rounded-md" />
          </div>
        ) : (
          <>
            {shown.map((v) => (
              <section
                key={v.seg}
                className={cn(positionsUi.panel, v.isNow && 'border-primary/45')}
                aria-label={v.title}
              >
                <header className={positionsUi.panelHead}>
                  <span className={cn(positionsUi.cap, v.isNow && 'text-primary')}>{v.window}</span>
                  <span className={positionsUi.panelTitle}>{v.title}</span>
                  {v.isNow ? (
                    <DenseTag variant="success" size="cell">
                      NOW
                    </DenseTag>
                  ) : null}
                  <span className="ml-auto text-dense-meta text-muted-foreground">{v.note}</span>
                </header>

                {v.rows.length === 0 ? (
                  <p className="m-0 px-3 py-2.5 text-dense-meta leading-normal text-muted-foreground text-pretty">
                    {v.clean.length === 0
                      ? 'Nothing in this part of the day can be checked yet.'
                      : `Nothing to do here. ${v.clean.length + v.partial.length} ${
                          v.clean.length + v.partial.length === 1 ? 'question was' : 'questions were'
                        } asked and came back clean${v.partial.length > 0 ? ', one of them only in part' : ''}.`}
                  </p>
                ) : (
                  v.rows.map((r) => (
                    <Link
                      key={r.key}
                      to={r.to}
                      className={cn(
                        'flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border/55 px-3 py-2',
                        'no-underline last:border-b-0 hover:bg-[var(--sk-raised2)]',
                      )}
                    >
                      <span
                        className={cn(
                          positionsUi.mono,
                          'w-11 shrink-0 text-dense-caption font-bold tracking-[0.06em]',
                          URGENCY[r.urg].ink,
                        )}
                      >
                        {URGENCY[r.urg].label}
                      </span>
                      <span className="text-xs leading-normal font-semibold text-foreground">{r.what}</span>
                      <span className="min-w-0 flex-[1_1_14rem] text-dense-meta leading-normal text-muted-foreground text-pretty">
                        {r.why}
                      </span>
                      <span className={cn('inline-flex items-center gap-1.5 text-dense-meta', HOME_LAYERS[r.layer].ink)}>
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
                        {HOME_LAYERS[r.layer].label} →
                      </span>
                    </Link>
                  ))
                )}

                {v.clean.length > 0 || v.partial.length > 0 || v.blind.length > 0 ? (
                  <div className={cn(FOOT, 'flex flex-col gap-1')}>
                    {v.clean.length > 0 ? (
                      <span className="inline-flex flex-wrap items-baseline gap-x-2">
                        <span className="inline-flex items-center gap-1.5 text-secondary-foreground">
                          <StatusLamp lamp="green" variant="dot" title="Asked and clean" />
                          Asked, nothing there:
                        </span>
                        {v.clean.map((c) => (
                          <span key={c.key}>{c.question}</span>
                        ))}
                      </span>
                    ) : null}
                    {v.partial.map((c) => (
                      <span key={c.key} className="inline-flex flex-wrap items-baseline gap-x-2">
                        <span className="inline-flex items-center gap-1.5 text-warning">
                          <StatusLamp lamp="yellow" variant="dot" title="Answered for part of the book" />
                          Asked, but not of the whole book:
                        </span>
                        <span className="text-secondary-foreground">{c.question}</span>
                        <span>— {c.partial}</span>
                        <Link to={c.to} className={positionsUi.link}>
                          {HOME_LAYERS[c.layer].label} →
                        </Link>
                      </span>
                    ))}
                    {v.blind.map((c) => (
                      <span key={c.key} className="inline-flex flex-wrap items-baseline gap-x-2">
                        <span className="inline-flex items-center gap-1.5 text-warning">
                          <StatusLamp lamp="yellow" variant="dot" title="Cannot be asked" />
                          Cannot ask:
                        </span>
                        <span className="text-secondary-foreground">{c.question}</span>
                        <span>— {c.cannotRun}</span>
                        <Link to={c.to} className={positionsUi.link}>
                          {HOME_LAYERS[c.layer].label} →
                        </Link>
                      </span>
                    ))}
                  </div>
                ) : null}
              </section>
            ))}

            <section className={cn(positionsUi.panel, 'border-warning/40')} aria-label="What this page cannot ask">
              <header className={positionsUi.panelHead}>
                <span className={positionsUi.cap}>Blind spots</span>
                <span className={positionsUi.panelTitle}>
                  {blindTotal} of {checks.length} questions cannot be asked
                </span>
                <DenseTag variant="warning" size="cell">
                  ⚠ absence of a row is not absence of a problem
                </DenseTag>
              </header>
              <p className="m-0 px-3 py-2.5 text-xs leading-normal text-secondary-foreground text-pretty">
                A quiet page means the {checks.length - blindTotal} questions that can be asked came back clean — not
                that nothing needs attention. The {blindTotal} above are listed under the part of the day they belong
                to, each with what is missing, so a reader can tell a clean answer from an unasked one.
              </p>
              <p className={cn(FOOT, 'm-0')}>
                Most of them close together: a daily snapshot answers the overnight questions, and a plan that reaches
                a position answers the stop and the planned exit.
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
