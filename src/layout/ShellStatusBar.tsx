/**
 * The 24px bar along the bottom of every page.
 *
 * It answers the questions you should never have to navigate to ask: what time
 * is it here, is anything degraded, is anyone waiting on me. It is fixed height
 * and never grows — the full version of any reading on it lives on a page, and
 * the segment is the way there.
 *
 * Design: `design/trade/Shell Spec Draft.md` §12.3, which specifies six
 * segments. Four are here. Two are not, and each for a reason found by
 * checking rather than by taste:
 *
 * - Book intraday P&L would be a half-truth. The stock side is computable, the
 *   option legs are not — the Trade side has no previous close for an option
 *   contract — and on a premium-selling book the option legs are where the
 *   day's money is.
 * - The business event ticker has no data source named anywhere in the design.
 *
 * Portfolio delta was dropped deliberately: it is the only reading here with no
 * threshold, so it cannot be acted on at a glance, and the cheap way to compute
 * it would put a second delta on screen disagreeing with Backing & Model. Worth
 * revisiting if D10 unlocks — hedging would make it drive an immediate decision
 * — or if it is given a band.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Inbox, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePlatformPlugins } from '@/hooks/usePlatformPlugins'
import { useBookCushion } from '@/hooks/useBookCushion'
import { SystemPopover } from './SystemPopover'
import { SHELL_STATUS_BAR_HEIGHT_CLASS } from './shellChrome'

/** Wall clock to the minute — the anchor every other reading on the page is "as of". */
function useWallClock(): string {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 15_000)
    return () => window.clearInterval(id)
  }, [])
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
}

const segmentClass =
  'inline-flex items-center gap-1.5 rounded px-1.5 text-dense-micro text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground'

function pctLabel(pct: number): string {
  return `${(pct * 100).toFixed(pct * 100 < 1 ? 1 : 0)}%`
}

interface ShellStatusBarProps {
  activeMsgCount: number
  onOpenMessages: () => void
}

export function ShellStatusBar({ activeMsgCount, onOpenMessages }: ShellStatusBarProps) {
  const clock = useWallClock()
  // The bar is the always-on reader; System › Platform polls the same query
  // key while it is open, so this stays one request either way.
  const { rows, isLoading } = usePlatformPlugins(true)
  const cushion = useBookCushion(true)

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

  return (
    <footer
      className={cn(
        SHELL_STATUS_BAR_HEIGHT_CLASS,
        'flex items-center gap-2 border-t border-border bg-card px-2',
      )}
      aria-label="Status bar"
    >
      <span className="font-mono text-dense-micro text-muted-foreground tabular-nums">{clock}</span>

      {cushion.tightCount > 0 && (
        <Link
          to="/portfolio/positions"
          className={cn(segmentClass, 'text-warning hover:text-warning')}
          title={
            `${cushion.tightCount} of ${cushion.shortLegCount} short legs within ${pctLabel(cushion.tightPct)} of the strike` +
            (cushion.breachedCount > 0 ? `, ${cushion.breachedCount} in the money` : '')
          }
        >
          <ShieldAlert className="h-3 w-3" aria-hidden />
          <span className="font-mono tabular-nums">
            {cushion.tightCount} {cushion.tightCount === 1 ? 'leg' : 'legs'} &lt;{pctLabel(cushion.tightPct)}
          </span>
        </Link>
      )}

      {cushion.unpricedCount > 0 && (
        <span
          className={cn(segmentClass, 'cursor-default')}
          title={`${cushion.unpricedCount} short leg(s) whose underlying carries no quote — unknown, not safe`}
        >
          <span className="font-mono tabular-nums">{cushion.unpricedCount} unpriced</span>
        </span>
      )}

      <div className="ml-auto flex items-center gap-1">
        {/* The lamp summarises the plugins, which is what it can afford to
            watch all day; the panel probes every service, but only while it
            is open. Thirteen /health calls every 20s from every page is a
            different load profile from one page that asked for them. */}
        <SystemPopover>
          <button type="button" className={segmentClass} title={system.title}>
            <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', system.dot)} />
            <span className="font-mono tabular-nums">{system.text}</span>
          </button>
        </SystemPopover>

        <button type="button" onClick={onOpenMessages} className={segmentClass} title="Messages">
          <Inbox className="h-3 w-3" aria-hidden />
          <span className="font-mono tabular-nums">{activeMsgCount}</span>
        </button>
      </div>
    </footer>
  )
}
