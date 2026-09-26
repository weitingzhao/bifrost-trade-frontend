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
import { HeroCard, HeroRow, PageHead, PageShell } from '@/components/layout'
import { ViewState } from '@bifrost/ui'
import { DenseTag, SegmentControl } from '@/components/data-display'
import { StatusLamp } from '@/components/StatusLamp'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { positionsUi } from '@/components/positions/positionsUi'
import { fmtPrice, pnlColorClass } from '@/utils/dailyChange'
import { fmtIsoDateToken } from '@/lib/format'
import { PAGE_ROUTES } from '@/layout/routeRegistry'
import { useTodayChecks } from './useTodayChecks'
import {
  HOME_LAYERS,
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

/** A panel's foot is a rule, not a band (1a). */
const FOOT = 'border-t px-3 py-1.5 text-dense-meta leading-normal text-muted-foreground text-pretty'

/** Urgency is a state: the tag's variant carries it, never a direction ink (Rev .82). */
const URGENCY: Record<HomeUrgency, { label: string; variant: 'danger' | 'warning' | 'neutral' }> = {
  now: { label: 'NOW', variant: 'danger' },
  soon: { label: 'SOON', variant: 'warning' },
  today: { label: 'TODAY', variant: 'neutral' },
}

const SEGMENT_TABS = [
  { value: 'all', label: 'All day' },
  { value: 'pre', label: 'Pre-open' },
  { value: 'rth', label: 'Intraday' },
  { value: 'close', label: 'Pre-close' },
]

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
  // The unscoped book, only to say how many items the account scope hides
  // (Rev .82: "scoped to X · N items hidden"). Same queries, so no new reads.
  const unscoped = useTodayChecks('all')

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
  const blind = useMemo(() => checks.filter((c) => c.cannotRun != null), [checks])
  const partial = useMemo(() => checks.filter((c) => c.cannotRun == null && c.partial != null), [checks])
  const layersTouched = new Set(rows.map((r) => r.layer)).size

  // §16.2: the three due-counts are the hero row, counted over the parts of
  // the day on screen — the tab narrows them as it narrows the rows.
  const shownDue = useMemo(() => countByUrgency(shown.flatMap((v) => v.rows)), [shown])
  const hidden = accountFilter === 'all' ? 0 : Math.max(0, allRows(unscoped.checks).length - rows.length)

  return (
    <PageShell padding="compact" className="space-y-3">
      {/* §16.10: the parts of the day are the head's own tabs; the lead,
          with its live count, is behind ⓘ. */}
      <PageHead
        title="Today"
        info={`${PAGE_LEAD} ${rows.length} open ${rows.length === 1 ? 'item' : 'items'} across ${layersTouched} ${
          layersTouched === 1 ? 'layer' : 'layers'
        }, each with a deep link into the one that owns it. Events and the Daily Brief run on the same axis; Live and Alerts sit on the right rail, beside any page.`}
        tabs={SEGMENT_TABS}
        tab={segFilter}
        onTab={(v) => setSegFilter(v as 'all' | HomeSegment)}
      />

      <div data-sr-toolbar="" role="toolbar" aria-label="Now">
        <span data-sr-tb="label">Now</span>
        <span className={cn(positionsUi.mono, 'text-dense-body text-foreground')}>{clock} ET</span>
        <span className={cn(positionsUi.mono, 'text-dense-meta text-muted-foreground')}>{sessionLabel(clock)}</span>
        <span data-sr-tb="meta" className="inline-flex items-center gap-2.5">
          <span className={positionsUi.mono}>{fmtIsoDateToken(today)}</span>
          {accountIds.length > 1 ? (
            <>
              {hidden > 0 ? (
                <span>
                  scoped to {accountFilter} · {hidden} {hidden === 1 ? 'item' : 'items'} hidden
                </span>
              ) : null}
              <SegmentControl
                size="xs"
                ariaLabel="Account"
                value={accountFilter}
                onChange={setAccountFilter}
                options={[{ value: 'all', label: 'All accounts' }, ...accountIds.map((a) => ({ value: a, label: a }))]}
              />
            </>
          ) : null}
        </span>
      </div>

      {error ? <QueryErrorAlert error={error} onRetry={() => void exposure.betaQuery.refetch()} /> : null}
      {loading ? (
        <section className="overflow-hidden border mat-card">
          <ViewState kind="loading" title="Loading today’s checks" rows={6} cols={4} />
        </section>
      ) : (
        <>
          <HeroRow label="Due">
            <HeroCard
              label="Due now"
              value={shownDue.now}
              valueClassName={shownDue.now > 0 ? 'text-foreground' : 'text-muted-foreground'}
              state={shownDue.now > 0 ? 'danger' : null}
              sub="act before the window closes"
              title="Items tagged NOW in the parts of the day shown"
            />
            <HeroCard
              label="Soon"
              value={shownDue.soon}
              valueClassName={shownDue.soon > 0 ? 'text-foreground' : 'text-muted-foreground'}
              sub="later in the same window"
              title="Items tagged SOON in the parts of the day shown"
            />
            <HeroCard
              label="Later today"
              value={shownDue.today}
              valueClassName="text-[var(--sk-soft)]"
              sub="no deadline inside the session"
              title="Items tagged TODAY in the parts of the day shown"
            />
          </HeroRow>

          <section className={positionsUi.panel} aria-label="Tape">
            <header className={positionsUi.panelHead}>
              <span className={positionsUi.cap}>Tape</span>
              <span className={positionsUi.panelTitle}>Index proxies · largest open risk</span>
              <Link to="/market/live" className="ml-auto whitespace-nowrap text-dense-meta text-primary no-underline hover:underline">
                Live · the full tape →
              </Link>
            </header>
            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2.5 px-3 py-2.5">
              {tape.map((t) => (
                <span key={t.symbol} className="inline-flex flex-none items-baseline gap-2">
                  {/* A symbol's own ink (Rev .82): the tape names tickers, not contracts. */}
                  <span className={cn(positionsUi.mono, 'text-dense-label font-bold text-entity-symbol')}>{t.symbol}</span>
                  <span className={cn(positionsUi.mono, 'text-dense-body text-foreground')}>{fmtPrice(t.last)}</span>
                  <span className={cn(positionsUi.mono, 'text-dense-label', pnlColorClass(t.changePct))}>
                    {fmtChangePct(t.changePct)}
                  </span>
                  <span className="text-dense-caption text-muted-foreground">{t.note}</span>
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
              className={cn(positionsUi.panel, v.isNow && 'border-[color-mix(in_srgb,var(--sk-accent)_45%,transparent)]')}
              aria-label={v.title}
            >
              <header className={positionsUi.panelHead}>
                <span className={cn(positionsUi.cap, v.isNow && 'text-primary')}>{v.window}</span>
                {/* The part of the day's scope is the title's tooltip, not a second line. */}
                <span className={positionsUi.panelTitle} title={v.note}>
                  {v.title}
                </span>
                <span className={cn(positionsUi.mono, 'text-dense-meta text-muted-foreground')}>
                  {v.rows.length} {v.rows.length === 1 ? 'item' : 'items'}
                </span>
                {v.isNow ? (
                  // The one active thing on the page (§1): the accent, solid.
                  <span className="rounded px-1.5 py-px font-mono text-dense-micro font-bold text-[var(--sk-on-accent)] bg-[var(--sk-accent)]">
                    NOW
                  </span>
                ) : null}
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
                    title={`Opens ${destinationLabel(r.to) ?? r.to} in ${HOME_LAYERS[r.layer].label}`}
                    className={cn(
                      'group grid grid-cols-[0.5rem_3.625rem_minmax(0,1fr)_auto] items-start gap-x-3',
                      'border-b px-3 py-2.25 text-inherit no-underline last:border-b-0',
                      'hover:bg-[color-mix(in_srgb,var(--sk-ink)_4%,transparent)] hover:text-inherit',
                    )}
                  >
                    <span
                      className={cn('mt-1 h-2 w-2 rounded-[2px] bg-current', HOME_LAYERS[r.layer].ink)}
                      aria-hidden
                    />
                    {/* Urgency is a state, so it is a tag variant (DS §4) — direction
                        red belongs to signed numbers only (§14.7, Rev .82). */}
                    <span className="mt-px inline-flex">
                      <DenseTag variant={URGENCY[r.urg].variant} size="cell">
                        {URGENCY[r.urg].label}
                      </DenseTag>
                    </span>
                    <span className="min-w-0">
                      <span className="block text-dense-body leading-[1.4] text-foreground text-pretty">{r.what}</span>
                      <span className="mt-0.5 block text-dense-label leading-[1.45] text-[var(--sk-mute2)] text-pretty">
                        {r.why}
                      </span>
                    </span>
                    <span className="mt-0.5 inline-flex flex-none items-center gap-2 whitespace-nowrap">
                      <span className={cn(positionsUi.mono, 'text-dense-caption text-muted-foreground')}>
                        {HOME_LAYERS[r.layer].label}
                      </span>
                      <span className="text-dense-meta text-primary opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                        {destinationLabel(r.to) ?? 'open'} →
                      </span>
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

          {/* Not in the prototype; kept (§16.0, §16.3): a quiet page is only a
              clean one for the questions this side can ask. */}
          <section className={cn(positionsUi.panel, 'border-[color-mix(in_srgb,var(--color-lamp-yellow)_55%,transparent)]')} aria-label="Blind spots">
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
                className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 border-b px-3 py-1.75 last:border-b-0"
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
                className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 border-b px-3 py-1.75 last:border-b-0"
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
        </>
      )}
    </PageShell>
  )
}
