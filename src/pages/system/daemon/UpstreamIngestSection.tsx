/**
 * What feeds the daemon, and who owns it.
 *
 * Four of the six ingest services — the Polygon socket and the three IB
 * Gateway processes — belong to the Ops platform, not to Trade. Trade's stake
 * in them is causal rather than operational: when they stop, this book goes
 * stale. So they are shown here read-only, with the reason and a way out to
 * the console that can actually act on them. The two Trade owns
 * (`trading_engine`, `account_sync_daemon`) keep their controls above.
 */
import { ExternalLink } from 'lucide-react'
import { DenseTag } from '@/components/data-display'
import { Skeleton } from '@/components/ui/skeleton'
import { DAEMON_PAGE_SERVICE_IDS, type MarketIngestServiceRow } from '@/utils/socketIngestLamp'

const OPS_CONSOLE_URL = import.meta.env.VITE_OPS_CONSOLE_URL ?? 'http://127.0.0.1:5180'

/** Why Trade cares about a service it does not run. */
const WHY: Record<string, string> = {
  polygon_ws: 'Live quotes and the option snapshot. Stops, and every price on this book is last night’s.',
  ib_operator: 'Carries commands to the IB Gateway. Stops, and the daemon’s requests go nowhere.',
  ib_ingestor: 'Brings IB market data in. Stops, and positions price off stale quotes.',
  ib_account_agent: 'Syncs account and position state from IB. Stops, and holdings drift from the broker.',
}

export function UpstreamIngestSection({
  services,
  isLoading,
  isError,
}: {
  services: MarketIngestServiceRow[]
  isLoading: boolean
  isError: boolean
}) {
  const owned = new Set<string>(DAEMON_PAGE_SERVICE_IDS)
  const upstream = services.filter((s) => !owned.has(s.id))

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline gap-2">
        <h3 className="text-dense-body font-semibold">Upstream</h3>
        <span className="text-dense-label text-muted-foreground">
          Run by the Ops platform. Shown because they decide whether this book is fresh.
        </span>
        <a
          href={`${OPS_CONSOLE_URL}/#ib-client`}
          target="_blank"
          rel="noreferrer"
          className="ml-auto inline-flex items-center gap-1 text-dense-label text-muted-foreground hover:text-foreground hover:underline"
        >
          Ops Console <ExternalLink className="size-3" />
        </a>
      </div>
      {isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : isError ? (
        <p className="text-dense-label text-destructive">Ops service list unavailable.</p>
      ) : upstream.length === 0 ? (
        <p className="text-dense-label text-muted-foreground">No upstream services reported.</p>
      ) : (
        <dl className="grid gap-x-6 gap-y-1.5 md:grid-cols-2">
          {upstream.map((s) => (
            <div key={s.id} className="min-w-0">
              <dt className="flex items-center gap-1.5">
                <span className="font-mono text-dense-caption">{s.id}</span>
                {s.process_active ? (
                  <DenseTag variant="neutral" size="cell">
                    {s.process_active}
                  </DenseTag>
                ) : null}
              </dt>
              <dd className="text-dense-label leading-snug text-muted-foreground">
                {WHY[s.id] ?? 'Upstream of this book.'}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}
