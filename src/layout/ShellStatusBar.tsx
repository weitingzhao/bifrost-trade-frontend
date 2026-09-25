/**
 * The status pill, bottom-left of every page (design Rev .57–.58,
 * `_Shell StatusBar.dc.html`, Shell Spec §5a.11 "状态条 → 左下状态胶囊").
 *
 * It answers the questions you should never have to navigate to ask: what time
 * is it in the market, how is the book doing today, is anything degraded, is
 * anyone waiting on me. The full version of any reading lives on a page, and
 * the segment is the way there.
 *
 * The full-width 24px strip retired into one glass capsule that floats over the
 * content — sidebar's right edge + 12, 12 off the bottom — and takes no height
 * from the page. Its panels (Book Live, System, Alerts) rise from the pill and
 * start at its left edge. The event ticker retired with the strip: its items
 * already live under Alerts. The pill narrows in three steps with the lane it
 * sits in: at 720 and up everything shows; from 440 the book's Δ goes; below
 * that only the session lamp, the book, the lamps and the Alerts count remain.
 *
 * The design's `data` segment (every source judged against its own cycle,
 * §16.14) is not here: §16.14 is still to be measured, and a lamp with nothing
 * behind it would claim a judgement this side does not make.
 *
 * The book's Δ is the model service's, the number Backing & Model and Risk ›
 * Portfolio hold — not a second, cheaper delta that could disagree with them.
 * The division the design settled is TopBar = position and focus, this pill =
 * health and alerts, sidebar foot = where to go.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
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
import type { AlertGroup, AlertsSummary } from '@/hooks/useAlerts'
import { useBottomLane } from './bottomLane'

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
  'inline-flex h-full shrink-0 items-center gap-1.5 whitespace-nowrap border-r border-[color-mix(in_srgb,var(--sk-ink)_8%,transparent)] px-[9px] text-dense-meta text-[var(--sk-mute2)] transition-colors last:border-r-0 hover:bg-[var(--sk-raised2)] hover:text-foreground'

/** The design's `.sb-pill`: a 28px glass capsule. */
const PILL =
  'flex h-7 items-stretch overflow-hidden rounded-full border border-[color-mix(in_srgb,var(--sk-ink)_10%,transparent)] ' +
  'bg-[color-mix(in_srgb,var(--sk-raised)_72%,transparent)] backdrop-blur-[14px] backdrop-saturate-[1.3] ' +
  'shadow-[inset_0_1px_0_color-mix(in_srgb,var(--sk-ink)_6%,transparent),0_10px_28px_rgba(0,0,0,0.45)]'

/** The design's `.sb-pop`: the panels that rise from the pill. */
const POP =
  'absolute bottom-9 left-0 z-[55] overflow-auto rounded-[var(--radius)] border border-[color-mix(in_srgb,var(--sk-ink)_14%,transparent)] ' +
  'bg-[color-mix(in_srgb,var(--sk-raised)_82%,transparent)] backdrop-blur-[16px] backdrop-saturate-[1.4]'

type Tier = 'full' | 'mid' | 'min'

/** The design's three widths: all · without Δ · lamps and counts only. */
function tierFor(width: number): Tier {
  return width >= 720 ? 'full' : width >= 440 ? 'mid' : 'min'
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
  const lane = useBottomLane()
  const tier = tierFor(lane.width)
  const toggleDrawer = () => setDrawerOpen((v) => !v)

  // Where the two right-hand segments sit in the capsule, so their panels can
  // start at the pill's left edge rather than under themselves.
  const systemRef = useRef<HTMLButtonElement>(null)
  const alertsRef = useRef<HTMLButtonElement>(null)
  const [offsets, setOffsets] = useState({ system: 0, alerts: 0 })

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

  // Re-measured whenever something that sets a segment's width changes.
  const widthKey = [tier, clock, totals.dayUsd, book.modelDelta, risk.text, breach.text, system.text, alerts.count].join('|')
  useLayoutEffect(() => {
    const system = systemRef.current?.offsetLeft ?? 0
    const alerts = alertsRef.current?.offsetLeft ?? 0
    setOffsets((o) => (o.system === system && o.alerts === alerts ? o : { system, alerts }))
  }, [widthKey])

  return (
    <footer
      data-sb-pill=""
      aria-label="Status"
      className="fixed bottom-3 z-[57] flex flex-col items-start transition-[left] duration-200 ease-out"
      style={{ left: lane.left }}
    >
      {drawerOpen ? (
        <div className={POP} style={{ width: `min(760px, calc(100vw - ${lane.left + 12}px))`, height: 260 }}>
          <BookLiveDrawer book={book} />
        </div>
      ) : null}
      <div data-sb-capsule="" className={PILL} style={{ maxWidth: Math.max(lane.width, 160) }}>
        <span
          className={cn(segmentClass, 'cursor-default text-foreground hover:bg-transparent')}
          title={`${session} — the session in New York, ${clock} ET`}
        >
          <span
            aria-hidden
            className={cn('h-[7px] w-[7px] rounded-full', session === 'RTH' ? 'bg-success' : 'bg-muted-foreground/50')}
          />
          {tier !== 'min' ? (
            <>
              <span className="font-semibold">{session}</span>
              <span className="font-mono tabular-nums text-muted-foreground">{clock} ET</span>
            </>
          ) : null}
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
          {tier === 'full' ? (
            <span className="font-mono tabular-nums text-muted-foreground">
              Δ {book.modelDelta == null ? '—' : signedInt(book.modelDelta)}
              {book.modelDegraded > 0 ? '+?' : ''}
            </span>
          ) : null}
          <span className="text-dense-micro text-muted-foreground" aria-hidden>
            {drawerOpen ? '▾' : '▴'}
          </span>
        </button>

        {tier !== 'min' ? (
          <button type="button" className={cn(segmentClass, risk.cls)} onClick={toggleDrawer} title={riskTitle}>
            <span className="font-mono tabular-nums">{risk.text}</span>
          </button>
        ) : null}

        <Link to="/risk/limits" className={cn(segmentClass, breach.cls)} title={breachTitle}>
          <span aria-hidden className={cn('h-[7px] w-[7px] rounded-full', breach.lamp)} />
          {tier !== 'min' ? <span className="font-mono tabular-nums">{breach.text}</span> : null}
        </Link>

        {/* The lamp summarises the plugins, which is what it can afford to
            watch all day; the panel probes every service, but only while it
            is open. Thirteen /health calls every 20s from every page is a
            different load profile from one page that asked for them. */}
        <SystemPopover alignOffset={offsets.system}>
          <button ref={systemRef} type="button" className={segmentClass} title={system.title}>
            <span aria-hidden className={cn('h-[7px] w-[7px] rounded-full', system.dot)} />
            {tier !== 'min' ? <span className="font-mono tabular-nums">{system.text}</span> : null}
          </button>
        </SystemPopover>

        {/* The design's `◍ Alerts` chip, drawn with the app's own bell — same
            signifier, one icon language. The `+?` is the load-bearing part:
            a source that could not be reached must not come out looking like
            an all-clear, so the count says it is a floor. */}
        <AlertsPopover groups={groups} count={alerts.count} onDismissAll={onDismissAll} alignOffset={offsets.alerts}>
          <button
            ref={alertsRef}
            type="button"
            className={segmentClass}
            title={
              alerts.incomplete
                ? `Alerts — ${alerts.unreachable.join(', ')} unreachable, the count may be short`
                : 'Alerts — risk limits, analyze, system, platform'
            }
          >
            <Bell className="h-3 w-3" aria-hidden />
            {tier !== 'min' ? <span>Alerts</span> : null}
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
