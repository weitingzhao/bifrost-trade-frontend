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
 * has a home that is not this route: `/research/events` (then the old
 * `EventRadarBody` board; its Market face since 2026-09-24 — the board itself
 * was deleted 2026-10-07, TD-199).
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
 * rows are the prototype's, not a promise this store can keep. Re-measured
 * 2026-09-26 for the §16 pass: 56 alerts (31 `weight_shift`, 25
 * `hit_rate_drop`), still every one with `symbol: null`, newest 2026-09-24.
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
import { Link, useNavigate } from 'react-router-dom'
import { ViewState } from '@bifrost/ui'
import { PageHead, PageHeadLink, PageShell, SectionPanel } from '@/components/layout'
import { StatusLamp } from '@/components/StatusLamp'
import { ALERTS_WINDOW_DAYS, useFiredAlerts } from '@/hooks/useFiredAlerts'
import { useLimitBook } from '@/hooks/useLimitBook'
import { usePreviewState } from '@/hooks/usePreviewState'
import { SYMBOL_PATH } from '@/lib/analyzeHubs'
import { withSymbolParam } from '@/lib/symbolLink'
import { failedDetail, sourceState, staleDetail } from '@/lib/viewState'
import { LIMIT_WATCH, fmtReading } from '@/utils/limitsModel'
import { firedRows, firedStanding } from './alertsModel'
import { cn } from '@/lib/utils'

// §17.2 (Rev .153): the list grammar — a sentence-case 11px mute header, no row rules.
const armedTh =
  'whitespace-nowrap px-2 py-1 text-right align-bottom text-dense-meta font-semibold leading-[1.3] text-[var(--sk-mute)]'
const armedTd = 'px-2 py-1.5 text-right font-mono text-dense-meta tabular-nums'

/** The store's own caps live with the shared query (`useFiredAlerts`). */
const WINDOW_DAYS = ALERTS_WINDOW_DAYS

/**
 * The movement is a hit rate moving (§14.8): a rate is a state, not money, so
 * a fall is amber and a rise is ink — never the profit / loss inks.
 */
const SINCE_TONE: Record<string, string> = {
  up: 'text-foreground',
  down: 'text-warning',
  flat: 'text-muted-foreground',
}
/** A count of what fired is a state: ink when quiet, amber when one wants a look. */
const STANDING_TONE: Record<string, string> = {
  ok: 'text-foreground',
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

  // §17.1: the fired queue is this page's own read; the limit book is cited
  // from Limits & Breaches and keeps its own loading line.
  const navigate = useNavigate()
  const preview = usePreviewState()
  const pageState =
    preview === 'loading' || preview === 'failed' || preview === 'stale' ? preview : sourceState(q)
  const shownRows = preview === 'empty' ? [] : rows

  return (
    <PageShell padding="compact" className="space-y-3">
      {/* §16.10: the lead behind ⓘ, the window as meta, Events as the head's door. */}
      <PageHead
        title="Alerts"
        info="Conditions you armed, and what has fired — the calendar itself lives in Events."
        meta={
          pageState === 'ready' ? (
            <span className="font-mono tabular-nums">
              {items.length} fired · {WINDOW_DAYS} days · {armedRows.length} armed
            </span>
          ) : undefined
        }
        actions={
          <PageHeadLink to="/research/events" title="The 30-day calendar of what is coming">
            Events calendar →
          </PageHeadLink>
        }
      />

      {pageState === 'stale' ? (
        <ViewState
          kind="stale"
          title="Couldn’t refresh the alert queue"
          detail={staleDetail(q, 'an alert written since then is not shown.')}
          onAction={() => void q.refetch()}
        />
      ) : null}

      <SectionPanel
        cap="Fired"
        title={
          <span className={STANDING_TONE[standing.tone]}>
            {pageState === 'ready' || pageState === 'stale' ? standing.text : 'newest first'}
          </span>
        }
        note="the same queue as the shell’s Analyze alerts — that panel shows 14 days, this page 90"
      >
        {pageState === 'loading' ? (
          <ViewState kind="loading" title="Reading the alert queue" rows={4} cols={4} />
        ) : pageState === 'failed' ? (
          <ViewState
            kind="failed"
            title="Couldn’t read the alert queue"
            detail={failedDetail(q, 'This is silence, not an all-clear — nothing here can say whether anything has fired.')}
            onAction={() => void q.refetch()}
          />
        ) : shownRows.length === 0 ? (
          <ViewState
            kind="empty"
            title={`Nothing fired in the last ${WINDOW_DAYS} days`}
            detail="The store answered and holds nothing in this window. Alerts are written nightly by the lens scan; an empty window means no lens moved enough to be worth saying."
          />
        ) : (
          <ul>
            {shownRows.map((r) => (
              /* The design's row is two lines at every width — the scope and
                 its readings first, the condition sentence under it — so a
                 narrow surface wraps instead of clipping. */
              <li key={r.id} data-sr-row="" className="px-3 py-2">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                  <StatusLamp lamp={r.lamp} variant="dot" className="h-2 w-2 shrink-0 self-center" />
                  <span className="min-w-0">
                    {/* A ticker keeps the ticker ink and opens its Symbol page; a
                        lens is a type, so it wears the state blue (Rev .91 —
                        a lens tag never borrows an entity ink or the accent). */}
                    {r.scopeIsSymbol ? (
                      <Link
                        to={withSymbolParam(SYMBOL_PATH, r.scope)}
                        className="font-mono text-dense-meta font-bold text-entity-symbol hover:underline"
                        title={`Open ${r.scope} on Symbol`}
                      >
                        {r.scope}
                      </Link>
                    ) : (
                      <span className="font-mono text-dense-meta font-bold text-[var(--sk-state-blue)]">
                        {r.scope}
                      </span>
                    )}
                    <span className="ml-2 font-mono text-dense-caption text-muted-foreground">{r.when}</span>
                  </span>
                  <span className="ml-auto flex min-w-0 flex-wrap items-baseline justify-end gap-x-3 gap-y-0.5">
                    <span
                      className={cn('text-right text-dense-caption', SINCE_TONE[r.sinceTone])}
                      title={r.since ?? 'this alert’s payload carries no before-and-after pair'}
                    >
                      {r.since ?? '—'}
                    </span>
                    <Link to={r.to} className="whitespace-nowrap text-dense-caption text-primary hover:underline">
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
        )}
      </SectionPanel>

      {/* ARMED — the design’s table, fed by the one store on this side that
          truly holds armed conditions: the risk limit book. Each row names
          the page that owns its reading; per-symbol arming from Symbol,
          Dealer and Watchlist has no store yet and the header says so. */}
      <SectionPanel
        cap="Armed"
        title={`${armedRows.length} rule${armedRows.length === 1 ? '' : 's'}`}
        note="alerts notify — they never trade (D10) · the limit book’s lines; per-symbol arming has no store yet"
      >
        {limitBook.statusLoading ? (
          <ViewState kind="loading" title="Reading the limit book" rows={4} cols={6} />
        ) : armedRows.length === 0 ? (
          <ViewState
            kind="empty"
            title="No limit carries a reading and a line"
            detail="Nothing is armed right now: no limit on the book has both a current reading and its trigger."
            actionLabel="Open Limits"
            onAction={() => navigate('/risk/limits')}
          />
        ) : (
          <div className="overflow-x-auto">
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
                      {/* A limit's scope is a word (book, account, pool), not a
                          ticker — ink, not the ticker lime. */}
                      <td className={cn(armedTd, 'text-left font-sans font-semibold text-foreground')}>{r.scope}</td>
                      <td className={cn(armedTd, 'text-left font-sans text-secondary-foreground')}>
                        {r.name} {r.bound === 'ceiling' ? '≥' : '≤'} {fmtReading(r, r.limit)}
                      </td>
                      <td className={armedTd}>{fmtReading(r, r.current)}</td>
                      <td className={cn(armedTd, 'text-muted-foreground')}>{fmtReading(r, r.limit)}</td>
                      <td className={cn(armedTd, 'text-left')}>
                        <span className="inline-flex w-full items-center gap-2">
                          <span className="relative block h-[5px] min-w-14 flex-1 overflow-hidden rounded-[3px] bg-[color-mix(in_srgb,var(--sk-ink)_8%,transparent)]">
                            <span
                              className={cn(
                                'absolute inset-y-0 left-0',
                                r.breached ? 'bg-destructive' : close ? 'bg-warning' : 'bg-[var(--sk-line2)]',
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
                        <Link
                          to="/risk/limits"
                          className="whitespace-nowrap text-dense-caption text-muted-foreground hover:text-foreground hover:underline"
                        >
                          Limits →
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="m-0 border-t border-border px-3 py-2 text-dense-caption leading-relaxed text-muted-foreground text-pretty">
          These are the limit book’s own lines — the one store on this side holding a reading, a
          trigger and the distance between. Arming a condition from the Symbol, Dealer or Watchlist
          pages needs a store none of the four candidates keeps (alerts hold what fired; playbook
          rules carry prose without predicates; triggers log only what already satisfied). A fired
          alert’s row opens the lens page that holds its history — the design’s per-alert
          Inspector with its Trigger context is owed with the per-symbol store.
        </p>
      </SectionPanel>
    </PageShell>
  )
}
