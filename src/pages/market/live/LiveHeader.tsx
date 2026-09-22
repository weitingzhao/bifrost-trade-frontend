/**
 * The header this page did not have.
 *
 * `Market Live.dc.html` opens with a title, one line saying what the page is,
 * and three readings pinned to the right: the streams lamp with a count, the
 * orders lamp, and where in the session we are. The production page had none
 * of it — not even an `<h1>`, which is also the house rule (`CLAUDE.md`: every
 * `PageShell` business page uses `PageHeader`).
 *
 * The lamps were already computed for the panels below; the header is where
 * the design puts them, because the two questions a tape has to answer before
 * anything else are *is this live* and *what time is it in the market*.
 */
import { StatusLamp } from '@/components/StatusLamp'
import { PageHeader } from '@/components/layout'
import { sessionLabel, sessionTag } from '@/lib/marketSession'

export interface LiveHeaderProps {
  streamsLamp: string
  ordersLamp: string
  /** Symbols with a quote fresh enough to be called live, over the total. */
  freshQuotes: number
  totalStreams: number
  ordersWorking: number
  /** `HH:MM` in New York, read once by the page. */
  clock: string
  actions?: React.ReactNode
}

export function LiveHeader({
  streamsLamp,
  ordersLamp,
  freshQuotes,
  totalStreams,
  ordersWorking,
  clock,
  actions,
}: LiveHeaderProps) {
  return (
    <PageHeader
      title="Live"
      description="The tape for this book — streams, marks and working orders."
      actions={
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span
            className="inline-flex items-center gap-1.5 text-dense-caption text-muted-foreground"
            title={`${freshQuotes} of ${totalStreams} streamed symbols have a quote under 60s old.`}
          >
            <StatusLamp lamp={streamsLamp} variant="dot" className="h-2 w-2" />
            <span className="font-mono tabular-nums">
              streams {freshQuotes}/{totalStreams}
            </span>
          </span>
          <span
            className="inline-flex items-center gap-1.5 text-dense-caption text-muted-foreground"
            title="Green when the Account Sync Daemon heartbeat is fresh — the link that puts working orders on this page."
          >
            <StatusLamp lamp={ordersLamp} variant="dot" className="h-2 w-2" />
            <span>
              orders link
              {ordersWorking > 0 ? (
                <span className="ml-1 font-mono tabular-nums">· {ordersWorking} working</span>
              ) : null}
            </span>
          </span>
          <span
            className="font-mono text-dense-caption tabular-nums text-muted-foreground"
            title={`${sessionLabel(clock)} in New York, read once when the page opened.`}
          >
            {sessionTag(clock)} · {clock} ET
          </span>
          {actions}
        </div>
      }
    />
  )
}
