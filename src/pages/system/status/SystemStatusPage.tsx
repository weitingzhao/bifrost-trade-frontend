/**
 * System Status — built 2026-09-22 against `System Status.dc.html`
 * (Rev 2026-09-20.16). The app had no page here.
 *
 * The Owner's 2026-09-15 ruling, made into a page: System collapses to this
 * and Settings. The design's footer draws the line and this page keeps it —
 * *green means trade; amber means trade with the stated caveat; red means
 * stop; anything needing a graph, a log or a rerun button is Ops Console's
 * job.* So there are three panels, one per question a trader asks before
 * opening a position, and no controls at all.
 *
 * ## Every reading belongs to another page
 *
 * Nothing here is computed for this page. Trading link is the monitor's own
 * `health.block_reasons` and daemon heartbeat; Market data is
 * `computeMarketStreamsLamp` and `countFreshQuotes`, which Live's header
 * reads; Nightly data is `overallRule`, which is Signal Health's own sentence.
 * A status page with its own opinion can disagree with the page it sends you
 * to, and then the reader has two answers and no way to choose (§14.2).
 *
 * ## What it says on DEV today
 *
 * Measured 2026-09-22: `health.block_reasons` answers
 * `["ib_not_connected", "socket_massive_disconnected"]` while
 * `daemon.heartbeat.daemon_alive` is true — so the first panel is red and
 * names both, which is the page doing its job on the first day it exists.
 *
 * ## Diverged, with its reason
 *
 * The design's footer says the top-bar system lamp and this page read the same
 * three aggregates. They do not yet: the bar's lamp summarises the platform
 * plugins, which is a fourth question — is the control plane up — and not one
 * a trader asks before opening a position. `worstLamp` is the value the bar
 * would read; changing what the bar watches is a shell decision with a cost
 * the design does not price, so it is named rather than made here.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PageHeader, PageShell } from '@/components/layout'
import { StatusLamp } from '@/components/StatusLamp'
import { cn } from '@/lib/utils'
import { OPS_CONSOLE_URL, opsConsoleHref } from '@/lib/opsConsole'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { useQuoteStream } from '@/hooks/useQuoteStream'
import { fetchSignalHealth } from '@/api/research/similarRegime'
import { useCoverageQuality } from '@/hooks/useMarketDataCoverage'
import {
  marketStanding,
  nightlyStanding,
  tradingStanding,
  watchlistDataLine,
  worstLamp,
  type DomainStanding,
} from './systemStanding'

const STATE_INK: Record<string, string> = {
  green: 'text-success',
  yellow: 'text-warning',
  red: 'text-danger',
  gray: 'text-muted-foreground',
}
/**
 * Where each question's diagnosis lives in the Ops Console: the daemon and the
 * IB link on Bus Status, the quote streams' source on IB Client, and the
 * nightly pipeline on Research Engine.
 */
const OPS_VIEW: Record<DomainStanding['key'], { view: string; label: string }> = {
  trading: { view: 'satellite-bus', label: 'Bus Status' },
  market: { view: 'ib-gateway-manage', label: 'IB Client' },
  nightly: { view: 'research-engine', label: 'Research Engine' },
}

const EDGE: Record<string, string> = {
  green: 'border-border',
  yellow: 'border-warning/45',
  red: 'border-danger/45',
  gray: 'border-border',
}

function DomainPanel({ d }: { d: DomainStanding }) {
  return (
    <section className={cn('overflow-hidden rounded-lg border', EDGE[d.lamp])}>
      <div className="grid grid-cols-[14px_minmax(0,200px)_minmax(0,1fr)_auto] items-center gap-3.5 px-4 py-3">
        <StatusLamp lamp={d.lamp} variant="dot" className="h-3 w-3" />
        <div className="flex flex-col gap-0.5">
          <span className="text-dense-body font-bold">{d.name}</span>
          <span className={cn('font-mono text-dense-caption', STATE_INK[d.lamp])}>{d.state}</span>
        </div>
        <p className="text-dense-meta leading-relaxed text-secondary-foreground">{d.why}</p>
        <span className="flex flex-col items-end gap-1">
          <Link to={d.to} className="whitespace-nowrap text-dense-caption hover:underline">
            {d.toLabel}
          </Link>
          <a
            href={opsConsoleHref(OPS_VIEW[d.key].view)}
            target="_blank"
            rel="noreferrer"
            className="whitespace-nowrap text-dense-caption text-muted-foreground hover:underline"
            title={`Diagnosis and repair live in the Ops Console — opens ${OPS_VIEW[d.key].label} in a new tab.`}
          >
            in Ops ↗
          </a>
        </span>
      </div>
      {d.detail.length > 0 ? (
        <div className="flex flex-col gap-1.5 border-t border-border/60 py-2 pl-11 pr-4">
          {d.detail.map((x) => (
            <div key={x.text} className="grid grid-cols-[10px_minmax(0,1fr)] items-baseline gap-2.5">
              <span
                className={cn(
                  'relative -top-px inline-block h-1.75 w-1.75 rounded-full',
                  x.tone === 'warn' ? 'bg-warning' : 'bg-muted-foreground',
                )}
              />
              <span className="text-dense-caption leading-relaxed text-muted-foreground">
                {x.text}
                {x.ops ? (
                  <>
                    {' '}
                    <a
                      href={opsConsoleHref(x.ops.view)}
                      target="_blank"
                      rel="noreferrer"
                      className="whitespace-nowrap hover:underline"
                      title={`Opens ${x.ops.label} in the Ops Console`}
                    >
                      {x.ops.label} in Ops ↗
                    </a>
                  </>
                ) : null}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  )
}

export default function SystemStatusPage() {
  const { data: status } = useMonitorStatus()
  const health = useQuery({
    queryKey: ['research', 'signal-health'],
    queryFn: fetchSignalHealth,
    staleTime: 60_000,
  })
  // The streams the monitor says are subscribed — the same list Live asks for,
  // without this page opening a second subscription of its own.
  // The plugin's own verdict over the watchlist: the one trader-facing line
  // the retired Coverage page carried (Owner 2026-09-25).
  const quality = useCoverageQuality()
  const streamKeys = status?.live_ui?.subscribed_tickers ?? []
  const { quotesMap } = useQuoteStream(streamKeys, [])
  // Read once: the freshness window must not move under the reader mid-render.
  const [nowSec] = useState(() => Date.now() / 1000)

  const domains = [
    tradingStanding(status),
    marketStanding(status, quotesMap, streamKeys, nowSec),
    nightlyStanding(health.data, health.isError, watchlistDataLine(quality.data, quality.isError)),
  ]

  return (
    <PageShell padding="compact" className="space-y-3">
      <PageHeader
        title="System Status"
        description="The trader's three questions — can I trade, can I see, did the data land. Diagnosis and repair live in Ops."
        actions={
          <a
            href={OPS_CONSOLE_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-dense-meta text-muted-foreground hover:underline"
            title={`Opens the Ops Console in a new tab. The worst of the three here is ${worstLamp(domains)}.`}
          >
            <StatusLamp lamp={worstLamp(domains)} variant="dot" className="h-2 w-2" />
            <span>Open Bifröst Ops ↗</span>
          </a>
        }
      />

      {domains.map((d) => (
        <DomainPanel key={d.key} d={d} />
      ))}

      <p className="text-dense-caption leading-relaxed text-muted-foreground">
        Owner ruling 2026-09-15: System collapses to this page and{' '}
        <Link to="/settings" className="text-foreground/80 hover:underline">
          Settings
        </Link>
        . Green means trade; amber means trade with the stated caveat; red means stop — anything
        needing a graph, a log or a rerun button is the Ops Console&rsquo;s job. Each panel sends
        you to the page that owns its detail, and every reading on it is that page&rsquo;s own, not
        a second opinion of it.
      </p>
    </PageShell>
  )
}
