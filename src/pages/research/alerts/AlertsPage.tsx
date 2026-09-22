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
 * has a home that is not this route: `/research/explorer?tab=events` renders
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
import { useQuery } from '@tanstack/react-query'
import { PageHeader, PageShell } from '@/components/layout'
import { StatusLamp } from '@/components/StatusLamp'
import { fetchAlerts } from '@/api/research/alertScan'
import { firedRows, firedStanding } from './alertsModel'
import { cn } from '@/lib/utils'

/** The store's own caps: it refuses more than 200 rows or 90 days. */
const WINDOW_DAYS = 90
const ROW_CAP = 200

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
  const q = useQuery({
    queryKey: ['research', 'alerts', 'page', WINDOW_DAYS],
    queryFn: () => fetchAlerts({ limit: ROW_CAP, days: WINDOW_DAYS }),
    staleTime: 60_000,
  })
  const items = useMemo(() => q.data?.items ?? [], [q.data?.items])
  const rows = firedRows(items)
  const today = new Date().toISOString().slice(0, 10)
  const standing = firedStanding(items, today, WINDOW_DAYS)

  return (
    <PageShell padding="compact" className="space-y-3">
      <PageHeader
        title="Alerts"
        description="Conditions you armed, and what has fired. The calendar itself lives with the events board."
        actions={
          <Link
            to="/research/explorer?tab=events"
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
            <li
              key={r.id}
              className="grid grid-cols-[8px_minmax(140px,190px)_minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-border/50 px-3 py-2 last:border-b-0"
            >
              <StatusLamp lamp={r.lamp} variant="dot" className="h-2 w-2" />
              <span className="min-w-0 truncate">
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
              <span className="min-w-0 truncate text-dense-caption" title={r.what}>
                {r.what}
              </span>
              <span
                className={cn('whitespace-nowrap text-dense-caption', SINCE_TONE[r.sinceTone])}
                title={r.since ?? 'this alert’s payload carries no before-and-after pair'}
              >
                {r.since ?? '—'}
              </span>
              <Link to={r.to} className="whitespace-nowrap text-dense-caption hover:underline">
                {r.dest}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="overflow-hidden rounded-lg border border-dashed border-border">
        <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border bg-secondary/40 px-3 py-2">
          <span className="text-dense-micro font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Armed
          </span>
          <span className="text-dense-body font-semibold">0 rules</span>
          <span className="ml-auto text-dense-caption text-muted-foreground">
            alerts notify — they never trade (D10)
          </span>
        </header>
        <div className="space-y-2 px-3 py-3 text-dense-caption leading-relaxed text-muted-foreground">
          <p>
            The design lists the conditions you armed with their reading, their trigger and the
            distance between.{' '}
            <span className="text-foreground/80">
              Nothing on this side records a condition before it fires
            </span>
            , and there is no control anywhere in the app that arms one.
          </p>
          <ul className="space-y-1">
            <li>
              <span className="font-mono text-foreground/70">/research/alerts</span> — what has
              fired, never what is waiting.
            </li>
            <li>
              <span className="font-mono text-foreground/70">/research/playbook/rules</span> — a
              title, a category and prose; no symbol and no predicate, so nothing can be compared
              against a reading.
            </li>
            <li>
              <span className="font-mono text-foreground/70">/research/playbook/triggers</span> —
              needs a symbol, and every row it returns is already satisfied: a log, not a queue.
            </li>
            <li>
              The risk limit book has the shape — a reading, a line, the distance — and is a
              different object.{' '}
              <Link to="/risk/limits" className="text-foreground hover:underline">
                Limits &amp; Breaches
              </Link>{' '}
              owns those, and drawing them here would be one book with two pages disagreeing.
            </li>
          </ul>
          <p>
            What would fill it is one store: a scope, a predicate, a threshold, the surface it was
            armed from, and when. Until then this section says so rather than showing an empty
            table that reads as “nothing is armed”.
          </p>
        </div>
      </section>
    </PageShell>
  )
}
