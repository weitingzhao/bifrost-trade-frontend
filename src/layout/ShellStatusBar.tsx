/**
 * The 24px bar along the bottom of every page.
 *
 * It answers the questions you should never have to navigate to ask: what time
 * is it here, is anything degraded, is anyone waiting on me. It is fixed height
 * and never grows — the full version of any reading on it lives on a page, and
 * the segment is the way there.
 *
 * Design: `design/trade/Shell Spec Draft.md` §12.3, which specifies six
 * segments. Three are here. The other three — book intraday P&L (with its
 * Book Live drawer), the short-leg cushion warning, and the business event
 * ticker — each need a data source this app does not read yet, and land with
 * that source rather than as an empty box now.
 */
import { useEffect, useState } from 'react'
import { Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePlatformPanel } from '@/hooks/usePlatformPanel'
import { usePlatformPlugins } from '@/hooks/usePlatformPlugins'
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

interface ShellStatusBarProps {
  activeMsgCount: number
  onOpenMessages: () => void
}

export function ShellStatusBar({ activeMsgCount, onOpenMessages }: ShellStatusBarProps) {
  const clock = useWallClock()
  // The bar is the always-on reader; the panel polls only while it is open, and
  // the two share a query key, so this is one request either way.
  const { rows, isLoading } = usePlatformPlugins(true)
  const { toggle } = usePlatformPanel()

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

      <div className="ml-auto flex items-center gap-1">
        <button type="button" onClick={toggle} className={segmentClass} title={system.title}>
          <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', system.dot)} />
          <span className="font-mono tabular-nums">{system.text}</span>
        </button>

        <button type="button" onClick={onOpenMessages} className={segmentClass} title="Messages">
          <Inbox className="h-3 w-3" aria-hidden />
          <span className="font-mono tabular-nums">{activeMsgCount}</span>
        </button>
      </div>
    </footer>
  )
}
