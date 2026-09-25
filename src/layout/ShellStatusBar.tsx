/**
 * The 24px bar along the bottom of every page.
 *
 * It answers the questions you should never have to navigate to ask: what time
 * is it in the market, how is the book doing today, is anything degraded, is
 * anyone waiting on me. The bar is fixed height; the full version of any
 * reading on it lives on a page, and the segment is the way there.
 *
 * Design: `design/trade/_Shell StatusBar.dc.html` (Shell Spec §12.3), six
 * segments in its order — session and clock, the book, short legs, limits,
 * the business event ticker, the system lamp, Alerts. The book segment opens
 * Book Live upward: a fixed 236px strip of the held book, the glance the
 * design places here, with Positions as the full table.
 *
 * Two segments were left out once, each for a reason that has since gone:
 * the book's day P&L (an option contract had no prior close on this side —
 * the vendor's dated close now supplies it, and a row it cannot price says so
 * and the total says it is a floor) and the event ticker (no source was named
 * — it is the newest item in the same alerts stream the bell groups).
 *
 * The book's Δ is the model service's, the number Backing & Model and Risk ›
 * Portfolio hold — not a second, cheaper delta that could disagree with them.
 *
 * Since 2026-09-20 this bar owns both panels the top bar used to duplicate:
 * the system lamp opens the service table, and the count chip — now named
 * **Alerts** — opens the four groups upward. The division the design settled
 * is TopBar = position and focus, StatusBar = health and alerts, sidebar foot
 * = where to go.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePlatformPlugins } from '@/hooks/usePlatformPlugins'
import { useBookCushion } from '@/hooks/useBookCushion'
import { useBookLive } from '@/hooks/useBookLive'
import { useRiskLimitWatch } from '@/hooks/useRiskLimitWatch'
import { sessionTag } from '@/lib/marketSession'
import { pnlColorClass } from '@/utils/dailyChange'
import { fmtSignedUsd0 } from '@/utils/performanceReading'
import { SystemPopover } from './SystemPopover'
import { BookLiveDrawer } from './BookLiveDrawer'
import { AlertsPopover } from '@/components/MessageCenter/AlertsPopover'
import type { AlertGroup, AlertItem, AlertsSummary } from '@/hooks/useAlerts'
import { SHELL_STATUS_BAR_HEIGHT_CLASS } from './shellChrome'

/**
 * New York wall clock to the minute — the anchor every other reading on the
 * page is "as of", and the zone the session is judged in.
 */
function useMarketClock(): string {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 15_000)
    return () => window.clearInterval(id)
  }, [])
  return now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/New_York',
  })
}

/** The design's `.sb-seg`: full height, a hairline to its right, quiet until hovered. */
const segmentClass =
  'inline-flex h-full shrink-0 items-center gap-1.5 whitespace-nowrap border-r border-[var(--sk-surface)] px-[9px] text-dense-micro text-[var(--sk-mute2)] transition-colors hover:bg-[var(--sk-raised2)] hover:text-foreground'

/**
 * When an alert happened, as a sortable instant and as the ticker prints it.
 * System messages carry unix seconds (printed as an ET clock); Research's
 * lens alerts carry a trade date (printed as that date). A label that is
 * neither — a checked-at clock string — cannot be ordered and is skipped.
 */
function eventTime(when: string | number): { at: number; label: string } | null {
  if (typeof when === 'number' && Number.isFinite(when)) {
    const label = new Date(when * 1000).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'America/New_York',
    })
    return { at: when, label }
  }
  const m = typeof when === 'string' ? /^(\d{4})-(\d{2})-(\d{2})/.exec(when) : null
  if (!m) return null
  return { at: Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 20) / 1000, label: `${m[2]}-${m[3]}` }
}

/** The newest alert that carries a time — the ticker's one line. */
function newestEvent(groups: readonly AlertGroup[]): { item: AlertItem; label: string } | null {
  let best: { item: AlertItem; at: number; label: string } | null = null
  for (const g of groups) {
    for (const it of g.items) {
      const t = eventTime(it.when)
      if (t && (best == null || t.at > best.at)) best = { item: it, ...t }
    }
  }
  return best ? { item: best.item, label: best.label } : null
}

function signedInt(v: number): string {
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(Math.round(v)).toLocaleString('en-US')}`
}

function pctLabel(pct: number): string {
  return `${(pct * 100).toFixed(pct * 100 < 1 ? 1 : 0)}%`
}

interface ShellStatusBarProps {
  groups: AlertGroup[]
  alerts: AlertsSummary
  onDismissAll: () => void
}

export function ShellStatusBar({ groups, alerts, onDismissAll }: ShellStatusBarProps) {
  const clock = useMarketClock()
  const session = sessionTag(clock)
  const [drawerOpen, setDrawerOpen] = useState(false)
  // The bar is the always-on reader; System › Platform polls the same query
  // key while it is open, so this stays one request either way.
  const { rows, isLoading } = usePlatformPlugins(true)
  const cushion = useBookCushion(true)
  const book = useBookLive(drawerOpen)
  const limits = useRiskLimitWatch()
  const event = useMemo(() => newestEvent(groups), [groups])
  const toggleDrawer = () => setDrawerOpen((v) => !v)

  // Grey is "not probed", not "broken" — the same HealthLamp semantics the rest
  // of the app uses. A plugin whose probe we could not run is an unknown, and
  // reporting it as degraded would cry wolf every time the gateway is out of
  // reach (which, on a local dev server, is always).
  const faults = rows.filter(r => r.lamp === 'degraded' || r.lamp === 'down').length
  const probed = rows.some(r => r.lamp !== 'unknown')
  const system = isLoading
    ? { dot: 'bg-muted-foreground/40', text: '—', title: 'Platform plugins — probing' }
    : faults > 0
      ? { dot: 'bg-warning', text: `${faults} degraded`, title: `${faults} platform plugin(s) degraded` }
      : probed
        ? { dot: 'bg-success', text: 'ok', title: 'All platform plugins healthy' }
        : { dot: 'bg-muted-foreground/40', text: 'no probe', title: 'Platform plugin status is unreachable' }

  // The book's day: a floor when any row could not be priced, and the `+?` says
  // so the way the Alerts count does — the known part plus an unknown one.
  const { totals } = book
  const priced = book.rows.length - totals.dayUnknown
  const bookTitle =
    book.rows.length === 0
      ? 'Book live — no holdings read yet'
      : [
          `Book live — day ${fmtSignedUsd0(totals.dayUsd)} over ${priced} of ${book.rows.length} holdings`,
          totals.dayUnknown > 0 ? `${totals.dayUnknown} without a day figure (hover a row's Day in the strip for why)` : null,
          book.modelDelta == null
            ? 'Δ: the model service has not answered'
            : `Δ ${signedInt(book.modelDelta)} shares-equivalent, the model service's book Δ` +
              (book.modelDegraded > 0 ? ` — ${book.modelDegraded} underlying(s) degraded, so it is short of them` : ''),
          drawerOpen ? 'Click to close the strip' : 'Click to open the positions strip',
        ]
          .filter(Boolean)
          .join('\n')

  const risk =
    cushion.tightCount > 0
      ? {
          text: `${cushion.tightCount} ${cushion.tightCount === 1 ? 'leg' : 'legs'} <${pctLabel(cushion.tightPct)}`,
          cls: 'text-warning hover:text-warning',
        }
      : cushion.unpricedCount > 0
        ? { text: `${cushion.unpricedCount} unpriced`, cls: '' }
        : { text: cushion.isLoading ? '—' : 'legs clear', cls: '' }
  const riskTitle = cushion.isError
    ? 'Short legs — the read failed; this is not an all-clear'
    : [
        `${cushion.tightCount} of ${cushion.shortLegCount} short legs within ${pctLabel(cushion.tightPct)} of the strike` +
          (cushion.breachedCount > 0 ? `, ${cushion.breachedCount} in the money` : ''),
        cushion.unpricedCount > 0 ? `${cushion.unpricedCount} whose underlying carries no quote — unknown, not safe` : null,
      ]
        .filter(Boolean)
        .join('\n')

  const breaches = limits.breaches
  const breach = limits.isLoading
    ? { text: '—', lamp: 'bg-muted-foreground/40', cls: '' }
    : breaches.length > 0
      ? { text: `${breaches.length} breach`, lamp: 'bg-danger', cls: 'text-danger hover:text-danger' }
      : { text: 'limits ok', lamp: 'bg-muted-foreground/40', cls: '' }
  const breachTitle =
    (breaches.length > 0 ? breaches.map((b) => b.name).join(' · ') : 'The lines the bar watches are within range') +
    `\nWatching: ${limits.watching.join(', ') || 'nothing yet'} — the rest live on Limits & Breaches`

  return (
    <footer className="flex shrink-0 flex-col border-t border-border bg-[var(--sk-ground)]" aria-label="Status bar">
      {drawerOpen ? <BookLiveDrawer book={book} /> : null}
      <div className={cn(SHELL_STATUS_BAR_HEIGHT_CLASS, 'flex items-stretch overflow-hidden')}>
        <span
          className={cn(segmentClass, 'cursor-default text-foreground hover:bg-transparent')}
          title={`${session} — the session in New York`}
        >
          <span
            aria-hidden
            className={cn('h-[7px] w-[7px] rounded-full', session === 'RTH' ? 'bg-success' : 'bg-muted-foreground/50')}
          />
          <span className="font-semibold">{session}</span>
          <span className="font-mono tabular-nums text-muted-foreground">{clock} ET</span>
        </span>

        <button
          type="button"
          className={cn(segmentClass, 'text-foreground')}
          onClick={toggleDrawer}
          aria-expanded={drawerOpen}
          title={bookTitle}
        >
          <span className="text-muted-foreground">book</span>
          <span className={cn('font-mono font-semibold tabular-nums', pnlColorClass(totals.dayUsd))}>
            {book.rows.length === 0 ? '—' : fmtSignedUsd0(totals.dayUsd)}
            {totals.dayUnknown > 0 ? <span className="text-muted-foreground">+?</span> : null}
          </span>
          <span className="font-mono tabular-nums text-muted-foreground">
            Δ {book.modelDelta == null ? '—' : signedInt(book.modelDelta)}
            {book.modelDegraded > 0 ? '+?' : ''}
          </span>
          <span className="text-dense-micro text-muted-foreground" aria-hidden>
            {drawerOpen ? '▾' : '▴'}
          </span>
        </button>

        <button type="button" className={cn(segmentClass, risk.cls)} onClick={toggleDrawer} title={riskTitle}>
          <span className="font-mono tabular-nums">{risk.text}</span>
        </button>

        <Link
          to="/risk/limits"
          className={cn(segmentClass, breach.cls)}
          title={breachTitle}
        >
          <span aria-hidden className={cn('h-[7px] w-[7px] rounded-full', breach.lamp)} />
          <span className="font-mono tabular-nums">{breach.text}</span>
        </Link>

        {/* The business event ticker: the newest item in the alerts stream the
            bell groups — the one line of news the bar can afford. */}
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden px-2.5 text-dense-micro">
          {event ? (
            <>
              <span className="shrink-0 font-mono tabular-nums text-muted-foreground">{event.label}</span>
              {event.item.to ? (
                <Link to={event.item.to} className="min-w-0 truncate text-muted-foreground hover:text-foreground" title={event.item.sub}>
                  {event.item.title}
                  {event.item.sub ? <span className="text-muted-foreground/70"> · {event.item.sub}</span> : null}
                </Link>
              ) : (
                <span className="min-w-0 truncate text-muted-foreground" title={event.item.sub}>
                  {event.item.title}
                  {event.item.sub ? <span className="text-muted-foreground/70"> · {event.item.sub}</span> : null}
                </span>
              )}
            </>
          ) : (
            <span className="text-muted-foreground/70">{alerts.checking ? 'reading the event stream…' : 'no dated events in the stream'}</span>
          )}
        </div>

        {/* The lamp summarises the plugins, which is what it can afford to
            watch all day; the panel probes every service, but only while it
            is open. Thirteen /health calls every 20s from every page is a
            different load profile from one page that asked for them. */}
        <SystemPopover>
          <button
            type="button"
            className={cn(segmentClass, 'border-l border-r-0 border-[var(--sk-surface)]')}
            title={system.title}
          >
            <span aria-hidden className={cn('h-[7px] w-[7px] rounded-full', system.dot)} />
            <span className="font-mono tabular-nums">{system.text}</span>
          </button>
        </SystemPopover>

        {/* The design's `◍ Alerts` chip, drawn with the app's own bell — same
            signifier, one icon language. The `+?` is the load-bearing part:
            a source that could not be reached must not come out looking like
            an all-clear, so the count says it is a floor. */}
        <AlertsPopover groups={groups} count={alerts.count} onDismissAll={onDismissAll}>
          <button
            type="button"
            className={cn(segmentClass, 'border-l border-r-0 border-[var(--sk-surface)]')}
            title={
              alerts.incomplete
                ? `Alerts — ${alerts.unreachable.join(', ')} unreachable, the count may be short`
                : 'Alerts — risk limits, analyze, system, platform'
            }
          >
            <Bell className="h-3 w-3" aria-hidden />
            <span>Alerts</span>
            <span className="font-mono tabular-nums">
              {alerts.count}
              {alerts.incomplete ? '+?' : ''}
            </span>
          </button>
        </AlertsPopover>
      </div>
    </footer>
  )
}
