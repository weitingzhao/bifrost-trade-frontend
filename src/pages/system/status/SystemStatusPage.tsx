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
import { Link } from 'react-router-dom'
import { PageHead, PageHeadLink, PageShell } from '@/components/layout'
import { RAISED_PANEL } from '@/components/layout/raisedPanel'
import { StatusLamp } from '@/components/StatusLamp'
import { cn } from '@/lib/utils'
import { OPS_CONSOLE_URL, opsConsoleHref } from '@/lib/opsConsole'
import { useSystemDomains } from '@/hooks/useSystemDomains'
import { worstLamp, type DomainStanding } from '@/utils/systemStanding'

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

/** A panel that needs attention says so with its edge; a calm one keeps the hairline. */
const EDGE: Record<string, string> = {
  green: '',
  yellow: 'border-warning/45',
  red: 'border-danger/45',
  gray: '',
}

function DomainPanel({ d }: { d: DomainStanding }) {
  return (
    <section className={cn(RAISED_PANEL, 'overflow-hidden', EDGE[d.lamp])}>
      <div className="grid grid-cols-[14px_minmax(0,220px)_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
        <StatusLamp lamp={d.lamp} variant="dot" />
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-bold text-foreground">{d.name}</span>
          <span className={cn('font-mono text-dense-meta tabular-nums', STATE_INK[d.lamp])}>{d.state}</span>
        </div>
        <p className="m-0 text-dense-label leading-[1.55] text-[var(--sk-soft)]">{d.why}</p>
        <span className="flex flex-col items-end gap-1">
          <Link to={d.to} className="whitespace-nowrap text-dense-meta text-[var(--sk-accent)] hover:underline">
            {d.toLabel}
          </Link>
          <a
            href={opsConsoleHref(OPS_VIEW[d.key].view)}
            target="_blank"
            rel="noreferrer"
            className="whitespace-nowrap text-dense-meta text-muted-foreground hover:underline"
            title={`Diagnosis and repair live in the Ops Console — opens ${OPS_VIEW[d.key].label} in a new tab.`}
          >
            in Ops ↗
          </a>
        </span>
      </div>
      {d.detail.length > 0 ? (
        <div className="flex flex-col gap-1.5 border-t border-[color-mix(in_srgb,var(--sk-line)_60%,transparent)] py-2 pl-11 pr-4">
          {d.detail.map((x) => (
            <div key={x.text} className="grid grid-cols-[10px_minmax(0,1fr)] items-baseline gap-2.5">
              <span
                className={cn(
                  'relative -top-px inline-block h-1.75 w-1.75 rounded-full',
                  x.tone === 'warn' ? 'bg-warning' : 'bg-muted-foreground',
                )}
              />
              <span className="text-dense-meta leading-normal text-[var(--sk-mute2)]">
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
  // The three questions, read by the one hook the sidebar's user centre also
  // reads (Rev .54) — the same aggregate in both places, never a second count.
  const domains = useSystemDomains({ live: true })

  return (
    <PageShell padding="compact" className="space-y-3">
      <PageHead
        title="System Status"
        info="The trader's three questions — can I trade, can I see, did the data land. Diagnosis and repair live in Ops."
        actions={
          <PageHeadLink
            href={OPS_CONSOLE_URL}
            title={`Opens the Ops Console in a new tab. The worst of the three here is ${worstLamp(domains)}.`}
          >
            Open Bifröst Ops ↗
          </PageHeadLink>
        }
      />

      {domains.map((d) => (
        <DomainPanel key={d.key} d={d} />
      ))}

      <p className="text-dense-meta leading-[1.6] text-muted-foreground">
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
