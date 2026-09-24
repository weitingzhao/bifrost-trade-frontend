/**
 * Alerts — walked against `Research Event Radar.dc.html` (Rev 2026-09-20.16)
 * on 2026-09-22. Observe-only: the design says it in the section header —
 * *alerts notify, they never trade (D10)*.
 *
 * ## The route changed subject, and the design says so
 *
 * This route held an Event Radar: an events table, theme aggregates and a
 * forward calendar. The design splits that in two — `/research/events` for the
 * 30-day calendar, and this route relabelled **Alerts** — and the split had
 * already been recorded on this side (`researchNavCatalog.ts`), waiting for
 * Events to exist before the calendar could come off.
 *
 * Two measurements made the move safe now rather than later. The events half
 * has a home that is not this route: `/research/events` renders
 * the same `EventRadarBody`, and has since the Owner's 2026-09-20 tab ruling.
 * And the events half has nothing in it: all four stores answer zero rows on
 * DEV 2026-09-22 — `event-radar/events` (also with `include_dropped`),
 * `events/calendar`, `events/themes`, `events/batches`, with
 * `excluded_placeholder_rows: 0`, so nothing was filtered out either. The
 * vendor gap behind them is a subscription one, already recorded by the Stock
 * ratings walk. Nothing is deleted here; the capability is untouched where it
 * lives, and the header links to it.
 *
 * ## Fired reads the panel's queue, because the design says which queue
 *
 * *"same items as the Analyze-alerts group — one queue, two views."* So this
 * reads `/research/alerts` through the same three helpers the shell panel
 * uses, moved to `lib/alertRanking` when this page became their second reader.
 * The page asks for the store's whole window (200 rows / 90 days, its own
 * caps) where the panel asks for 20 over 14 days — a page holds the record and
 * a panel holds what is live — and the header says so rather than leaving two
 * counts to disagree silently.
 *
 * Measured on DEV 2026-09-22: 44 alerts, `weight_shift` 23 and `hit_rate_drop`
 * 21, over five lenses, **every one with `symbol: null`**. This queue is about
 * lenses, not names, so Scope is the lens and the design's per-symbol fixture
 * rows are the prototype's, not a promise this store can keep.
 *
 * ## Armed is owed, and every source for it was checked
 *
 * Nothing on this side records a condition *before* it fires:
 * `/research/alerts` holds only what has fired; `/research/playbook/rules`
 * carries a title, a category and prose, with no symbol and no predicate;
 * `/research/playbook/triggers` needs a symbol, and answers `satisfied: true`
 * on all 42 rows it returns for NVDA — a log of triggers already satisfied,
 * never a pending one. The risk limit book has the shape (a reading, a line, a
 * distance) and is a different object: portfolio lines that Limits & Breaches
 * owns, not conditions armed from a symbol. The section keeps its place and
 * names all four rather than drawing an empty table.
 */
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, PageShell } from '@/components/layout'
import { StatusLamp } from '@/components/StatusLamp'
import { ALERTS_WINDOW_DAYS, useFiredAlerts } from '@/hooks/useFiredAlerts'
import { useLimitBook } from '@/hooks/useLimitBook'
import { LIMIT_WATCH, fmtReading } from '@/utils/limitsModel'
import { firedRows, firedStanding } from './alertsModel'
import { cn } from '@/lib/utils'

const armedTh =
  'whitespace-nowrap border-b border-border px-2 py-1 text-right align-bottom text-dense-caption font-semibold text-secondary-foreground'
const armedTd = 'border-b border-border/40 px-2 py-1.5 text-right font-mono text-dense-meta tabular-nums'

/** The store's own caps live with the shared query (`useFiredAlerts`). */
const WINDOW_DAYS = ALERTS_WINDOW_DAYS

const SINCE_TONE: Record<string, string> = {
  up: 'text-success',
  down: 'text-danger',
  flat: 'text-muted-foreground',
}
const STANDING_TONE: Record<string, string> = {
  ok: 'text-success',
  warn: 'text-warning',
  gray: 'text-muted-foreground',
}

export default function AlertsPage() {
  // Shared with the rail's Market count — one query, so the page's FIRED and
  // the dock's amber number cannot disagree.
  const q = useFiredAlerts()
  const items = useMemo(() => q.data?.items ?? [], [q.data?.items])
  const rows = firedRows(items)
  const today = new Date().toISOString().slice(0, 10)
  const standing = firedStanding(items, today, WINDOW_DAYS)
  // The limit book is the armed table's store — same hook Limits & Breaches
  // reads, so the two pages cannot disagree (§14.2).
  const limitBook = useLimitBook('all')
  const armedRows = limitBook.rows.filter((r) => r.current != null && r.limit != null)


  return (
    <PageShell padding="compact" className="space-y-3">
      <PageHeader
        title="Alerts"
        description="Conditions you armed, and what has fired. The calendar itself lives with the events board."
        actions={
          <Link
            to="/research/events"
            className="text-dense-meta text-muted-foreground hover:text-foreground"
          >
            Events calendar →
          </Link>
        }
      />

      <section className="overflow-hidden rounded-lg border border-border">
        <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border bg-secondary/40 px-3 py-2">
          <span className="text-dense-micro font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Fired
          </span>
          <span className={cn('text-dense-body font-semibold', STANDING_TONE[standing.tone])}>
            {q.isPending ? 'reading the queue…' : standing.text}
          </span>
          <span className="ml-auto text-dense-caption text-muted-foreground">
            the same queue as the shell’s Analyze alerts — that panel shows 14 days, this page 90
          </span>
        </header>

        {q.isError ? (
          <p role="status" className="px-3 py-3 text-dense-meta text-danger">
            The alert store did not answer. This is silence, not an all-clear — nothing here can
            say whether anything has fired.
          </p>
        ) : null}

        {!q.isError && !q.isPending && rows.length === 0 ? (
          <p className="px-3 py-3 text-dense-caption leading-relaxed text-muted-foreground">
            The store answered and holds nothing in this window. Alerts are written nightly by the
            lens scan; an empty window means no lens moved enough to be worth saying.
          </p>
        ) : null}

        <ul>
          {rows.map((r) => (
            /* The design's row is two lines at every width — the scope and
               its readings first, the condition sentence under it — so a
               narrow surface wraps instead of clipping. */
            <li key={r.id} className="border-b border-border/50 px-3 py-2 last:border-b-0">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                <StatusLamp lamp={r.lamp} variant="dot" className="h-2 w-2 shrink-0 self-center" />
                <span className="min-w-0">
                  <span
                    className={cn(
                      'font-mono text-dense-meta font-bold',
                      r.scopeIsSymbol ? 'text-foreground' : 'text-primary',
                    )}
                  >
                    {r.scope}
                  </span>
                  <span className="ml-2 font-mono text-dense-caption text-muted-foreground">
                    {r.when}
                  </span>
                </span>
                <span className="ml-auto flex min-w-0 flex-wrap items-baseline justify-end gap-x-3 gap-y-0.5">
                  <span
                    className={cn('text-right text-dense-caption', SINCE_TONE[r.sinceTone])}
                    title={r.since ?? 'this alert’s payload carries no before-and-after pair'}
                  >
                    {r.since ?? '—'}
                  </span>
                  <Link to={r.to} className="whitespace-nowrap text-dense-caption hover:underline">
                    {r.dest}
                  </Link>
                </span>
              </div>
              <p className="m-0 mt-0.5 pl-5 text-dense-caption leading-snug text-muted-foreground text-pretty">
                {r.what}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* ARMED — the design’s table, fed by the one store on this side that
          truly holds armed conditions: the risk limit book. Each row names
          the page that owns its reading; per-symbol arming from Symbol,
          Dealer and Watchlist has no store yet and the header says so. */}
      <section className="overflow-hidden rounded-lg border border-border">
        <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border bg-secondary/40 px-3 py-2">
          <span className="text-dense-micro font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Armed
          </span>
          <span className="text-dense-body font-semibold">
            {armedRows.length} rule{armedRows.length === 1 ? '' : 's'}
          </span>
          <span className="ml-auto text-dense-caption text-muted-foreground">
            alerts notify — they never trade (D10) · the limit book’s lines; per-symbol arming has no
            store yet
          </span>
        </header>
        {limitBook.statusLoading ? (
          <p className="px-3 py-3 text-dense-caption text-muted-foreground">Reading the limit book…</p>
        ) : armedRows.length === 0 ? (
          <p className="px-3 py-3 text-dense-caption text-muted-foreground">
            No limit carries both a reading and a line right now — the book is on{' '}
            <Link to="/risk/limits" className="text-foreground hover:underline">
              Limits &amp; Breaches
            </Link>
            .
          </p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={cn(armedTh, 'text-left')}>Scope</th>
                <th className={cn(armedTh, 'text-left')}>Condition</th>
                <th className={armedTh}>Now</th>
                <th className={armedTh}>Trigger</th>
                <th className={cn(armedTh, 'w-[22%] text-left')}>Distance</th>
                <th className={cn(armedTh, 'text-left')}>Source</th>
                <th className={cn(armedTh, 'text-left')} />
              </tr>
            </thead>
            <tbody>
              {armedRows.map((r) => {
                const use = r.use
                const close = !r.breached && use != null && use > LIMIT_WATCH
                const away = use != null ? Math.max(0, Math.round((1 - use) * 100)) : null
                return (
                  <tr key={r.key}>
                    <td className={cn(armedTd, 'text-left font-mono font-bold text-foreground')}>{r.scope}</td>
                    <td className={cn(armedTd, 'text-left font-sans text-secondary-foreground')}>
                      {r.name} {r.bound === 'ceiling' ? '≥' : '≤'} {fmtReading(r, r.limit)}
                    </td>
                    <td className={armedTd}>{fmtReading(r, r.current)}</td>
                    <td className={armedTd}>{fmtReading(r, r.limit)}</td>
                    <td className={cn(armedTd, 'text-left')}>
                      <span className="inline-flex w-full items-center gap-2">
                        <span className="relative block h-[5px] min-w-14 flex-1 overflow-hidden rounded-[3px] bg-[var(--sk-line0,var(--border))]">
                          <span
                            className={cn(
                              'absolute inset-y-0 left-0',
                              r.breached ? 'bg-destructive' : close ? 'bg-warning' : 'bg-[var(--sk-mute2,#98a2b0)]',
                            )}
                            style={{ width: `${use != null ? Math.min(100, use * 100) : 0}%` }}
                          />
                        </span>
                        <span
                          className={cn(
                            'whitespace-nowrap font-mono text-dense-micro',
                            r.breached ? 'text-destructive' : close ? 'text-warning' : 'text-muted-foreground',
                          )}
                        >
                          {r.breached ? 'breached' : close ? 'close' : away != null ? `${away}% away` : '—'}
                        </span>
                      </span>
                    </td>
                    <td className={cn(armedTd, 'text-left font-sans text-muted-foreground')}>
                      {r.citedFrom ? (
                        <Link to={r.citedFrom.to} className="hover:underline">
                          {r.citedFrom.label}
                        </Link>
                      ) : (
                        r.group
                      )}
                    </td>
                    <td className={cn(armedTd, 'text-left')}>
                      {/* The design disarms in place; a limit’s line is owned by
                          its own page, so the honest verb here is the door. */}
                      <Link to="/risk/limits" className="whitespace-nowrap text-dense-caption text-muted-foreground hover:text-foreground hover:underline">
                        Limits →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        <p className="m-0 border-t border-border/60 px-3 py-2 text-dense-caption leading-relaxed text-muted-foreground text-pretty">
          These are the limit book’s own lines — the one store on this side holding a reading, a
          trigger and the distance between. Arming a condition from the Symbol, Dealer or Watchlist
          pages needs a store none of the four candidates keeps (alerts hold what fired; playbook
          rules carry prose without predicates; triggers log only what already satisfied). A fired
          alert’s row opens the lens page that holds its history — the design’s per-alert
          Inspector with its Trigger context is owed with the per-symbol store.
        </p>
      </section>
    </PageShell>
  )
}
