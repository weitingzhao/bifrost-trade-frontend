/**
 * Trade · Desk — the process between Research and the book.
 *
 * Design DECISIONS 2026-09-18: `Desk = 今日行动队列(to act) + 运行态摘要`, with
 * the lineage on Rules. Three lanes — what was handed to you, what is out for a
 * fill, what settled — and above them the four readings a desk checks before it
 * acts on any of them.
 *
 * **The hedge menu is the one write on this page, and it is a move, not a new
 * capability** (Owner ruling 2026-09-18, option A). Suspend, resume and
 * emergency flatten have existed since the Daemon page, moved to Strategy ›
 * Instances when the Owner ruled they were trading decisions rather than daemon
 * telemetry, and land here because this is the trader's home. Same three
 * endpoints, same consumer, same semantics; the acknowledgement on flatten is
 * the only thing added. D10 continues to govern, held where it has always been
 * held — the spine and the daemon overlays, not the presence of a button.
 *
 * Everything else reads. Orders are worked in TWS; the desk copies.
 */
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PageHeader, PageShell } from '@/components/layout'
import { DenseTag } from '@/components/data-display'
import { StatusLamp } from '@/components/StatusLamp'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { positionsUi } from '@/components/positions/positionsUi'
import { mapIntentToPrefill } from '@/components/strategy/orderIntentPrefill'
import { fetchOrderIntents } from '@/api/research/orderIntents'
import { fetchShortLegs } from '@/api/shortLegs'
import { useCushionThreshold } from '@/hooks/useCushionThreshold'
import { useExecutionsCanonical } from '@/hooks/useExecutions'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { inAccountScope, useAccountScope } from '@/lib/accountScope'
import { useOpenOrders } from '@/hooks/useOpenOrders'
import { useRulesChain } from '@/hooks/useRulesChain'
import { useStrategyPlans } from '@/hooks/useStrategyPlans'
import { rollupMargin } from '@/utils/marginPressure'
import { chicagoTodayDateStr } from '@/utils/ledger/optAsOfPnL'
import { cn } from '@/lib/utils'
import { DeskLaneList, DeskStrip, type StripCell } from './DeskLanes'
import { HedgeMenu } from './HedgeMenu'
import { hedgeReading } from './hedgeModel'
import { buildLanes, needsYou, type DeskItem } from './deskModel'
import { planLineage } from '@/pages/trade/plans/planLineage'

/** Advisory proposals only: an intent that was acted on is no longer handed to you. */
const INTENT_STATUS = 'pending'

export default function TradeDeskPage() {
  const navigate = useNavigate()
  const status = useMonitorStatus()
  const chain = useRulesChain()
  const { pct: tightPct } = useCushionThreshold()
  const [copied, setCopied] = useState<string | null>(null)

  const intents = useQuery({
    queryKey: ['research', 'order-intents', INTENT_STATUS],
    queryFn: () => fetchOrderIntents({ status: INTENT_STATUS }),
    staleTime: 60_000,
  })
  const legs = useQuery({
    queryKey: ['portfolio', 'short-legs'],
    queryFn: ({ signal }) => fetchShortLegs(signal),
    staleTime: 30_000,
  })
  const plans = useStrategyPlans({})
  const orders = useOpenOrders()
  const execs = useExecutionsCanonical()

  const today = chicagoTodayDateStr()

  // The shell's account scope (Rev .58): legs, plans, orders, fills and the
  // margin read follow it. Research's intents carry no account — they are
  // proposals, not positions — so the Decide lane reads them whole.
  const acct = useAccountScope()
  const hostId = status.data?.config?.ib_client?.account?.event_host ?? ''
  const secondaryId = status.data?.config?.ib_client?.account?.event_secondary ?? ''

  const lanes = useMemo(
    () =>
      buildLanes({
        intents: intents.data?.items ?? [],
        legs: (legs.data?.legs ?? []).filter((l) => inAccountScope(l.account_id, acct, hostId, secondaryId)),
        tightPct,
        plans: (plans.data?.items ?? []).filter((p) => inAccountScope(p.account_id, acct, hostId, secondaryId)),
        orders: (orders.data ?? []).filter((o) => inAccountScope(o.account_id, acct, hostId, secondaryId)),
        fills: (execs.data?.items ?? []).filter((f) => inAccountScope(f.account_id, acct, hostId, secondaryId)),
        // One rule for "outside the rules", shared with Plans so the two pages
        // cannot disagree about which plans the daemon's book covers.
        outsideRules: (p) => {
          const l = planLineage(p, chain.data.opportunities, chain.data.allocations)
          return l.outsideRules ? l.read : null
        },
        today,
      }),
    [
      intents.data?.items,
      legs.data?.legs,
      tightPct,
      plans.data?.items,
      orders.data,
      execs.data?.items,
      chain.data.opportunities,
      chain.data.allocations,
      today,
      acct,
      hostId,
      secondaryId,
    ],
  )

  const need = useMemo(() => needsYou(lanes), [lanes])
  const hedge = hedgeReading(status.data)

  /** What the daemon is on, read from the rulebook rather than from its config. */
  const active = useMemo(() => {
    const alloc = chain.data.allocations.find((a) => a.is_active) ?? null
    const gate = alloc == null ? null : chain.data.gates.find((g) => g.gate_safety_strategy_id === alloc.gate_safety_strategy_id) ?? null
    const open = chain.data.instances.filter((i) => !i.closed).length
    // The strategy service answers 200 with an empty list now and then, and a
    // successful empty response is indistinguishable from an empty book. It is
    // caught the way Rules catches it: cross-checked against a count that did
    // arrive in the same batch, and said out loud rather than retried, because
    // a silent retry hides the defect and "genuinely none" is a legal answer.
    const unread = chain.data.opportunities.length > 0 && chain.data.instances.length === 0
    return { alloc, gate, open, unread }
  }, [chain.data])

  const margin = useMemo(
    () =>
      rollupMargin(
        (status.data?.portfolio.accounts ?? []).filter((a) => inAccountScope(a.account_id, acct, hostId, secondaryId)),
      ),
    [status.data?.portfolio.accounts, acct, hostId, secondaryId],
  )

  const cells: StripCell[] = [
    {
      label: 'Session',
      value: '—',
      // The design reads a market clock here. Nothing on this side reports
      // one: no session, no close time, no exchange calendar — the browser's
      // own clock is not a reading, and printing it as one is the mistake the
      // freshness badges exist to prevent (§11.3.1).
      note: (
        <>
          No session is reported on this side. The feed’s own state is in the bar at the top of every page, and{' '}
          <Link to="/market/live" className={positionsUi.link}>
            Live
          </Link>{' '}
          is where it is judged.
        </>
      ),
      lamp: 'gray',
      marker: 'no market clock',
    },
    {
      label: 'Daemon · allocation',
      value: active.alloc?.name ?? 'no active allocation',
      note: `${hedge.alive ? `alive · ${hedge.state ?? 'running'}` : 'not running'}${
        active.gate ? ` · gate ${active.gate.name}` : ' · no gate'
      } · ${active.unread ? 'instances unread' : `${active.open} instance${active.open === 1 ? '' : 's'} open`}`,
      lamp: !hedge.alive ? 'gray' : active.alloc == null ? 'yellow' : 'green',
      slot: <HedgeMenu status={status.data} onChanged={() => void status.refetch()} />,
    },
    {
      label: 'Pressure now → if all fill',
      value:
        margin.tightest?.pressure == null
          ? '—'
          : `${Math.round((margin.tightest.pressure ?? 0) * 100)}% tightest · ${
              margin.pressure == null ? '—' : `${Math.round(margin.pressure * 100)}% book`
            }`,
      // Pressure now is the broker's own figure. The second half is not taken:
      // what an intent would consume needs its collateral, and `strategy_plan`
      // stores the target, the stop and the limit — never the cash.
      note:
        'Excess liquidity against net liquidation, per account, as the broker reports it. What the intents would add is not taken — no plan field carries an intent’s collateral.',
      lamp: margin.tightest?.pressure == null ? 'gray' : margin.tightest.pressure > 0.5 ? 'yellow' : 'green',
      marker: 'if all fill not computed',
    },
    {
      label: 'Needs you',
      value: `${need.n} item${need.n === 1 ? '' : 's'}`,
      note: need.note,
      lamp: need.n === 0 ? 'green' : 'yellow',
    },
  ]

  function runAction(item: DeskItem, index: number) {
    const action = item.actions[index]
    if (action?.kind === 'createOpportunity') {
      const draft = (intents.data?.items ?? []).find((d) => d.id === action.ref)
      if (draft == null) return
      // The design's Proposal → Opportunity flow: Rules opens the New
      // opportunity sheet already filled in, and the write happens there under
      // the same validation every other opportunity goes through.
      navigate('/trade/rules', { state: { opportunityPrefill: mapIntentToPrefill(draft.payload) } })
      return
    }
    if (action?.kind === 'copyIntent') {
      const draft = (intents.data?.items ?? []).find((d) => d.id === action.ref)
      if (draft == null) return
      void navigator.clipboard?.writeText(JSON.stringify(draft.payload, null, 2)).then(
        () => {
          setCopied(draft.id)
          window.setTimeout(() => setCopied((c) => (c === draft.id ? null : c)), 2000)
        },
        () => undefined,
      )
    }
  }

  const loading = status.isLoading || chain.loading || legs.isLoading
  const error = status.error ?? chain.error ?? legs.error ?? null

  return (
    <PageShell padding="compact" className="space-y-3">
      <PageHeader
        title="Trade Desk"
        description="The process between Research and the book: what was handed to you, what is out for a fill, what settled. Every item ends in a plan, a fill, or a dismissal. Orders are worked in TWS — the desk copies (D10)."
        actions={
          <span className="flex flex-wrap items-center gap-2">
            {copied ? (
              <DenseTag variant="success" size="cell">
                payload copied
              </DenseTag>
            ) : null}
            <Link to="/trade/plans" className={cn(positionsUi.btn, 'no-underline')}>
              All plans →
            </Link>
            <Link to="/trade/plans?new=1" className={cn(positionsUi.btn, 'no-underline border-primary text-primary')}>
              ＋ Plan a trade
            </Link>
          </span>
        }
      />

      {error ? <QueryErrorAlert error={error} onRetry={() => void status.refetch()} /> : null}

      {loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20 w-full rounded-md" />
          <Skeleton className="h-72 w-full rounded-md" />
        </div>
      ) : (
        <>
          <DeskStrip cells={cells} />

          {active.unread ? (
            <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-warning/40 bg-[var(--sk-raised)] px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty">
              <span className="font-semibold text-warning">The strategy service returned no instances.</span>
              The rulebook has {chain.data.opportunities.length} opportunities, so this is the service answering empty
              rather than a desk with nothing running. What is in force below is read short by it.
              <button type="button" className={positionsUi.btn} onClick={() => chain.refetch()}>
                Ask again
              </button>
            </p>
          ) : null}

          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,21.25rem),1fr))] items-start gap-3">
            {lanes.map((lane) => (
              <DeskLaneList key={lane.key} lane={lane} onAction={runAction} />
            ))}
          </div>

          <section className={positionsUi.panel} aria-label="Rules in force">
            <header className={positionsUi.panelHead}>
              <span className={positionsUi.panelTitle}>Rules in force</span>
              <span className={positionsUi.panelNote}>
                what the daemon is running and what it may do — every plan above is checked against these
              </span>
              <Link to="/trade/rules" className={cn(positionsUi.link, 'ml-auto')}>
                Open the chain →
              </Link>
            </header>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13.75rem),1fr))]">
              {[
                {
                  k: 'Allocation',
                  v: active.alloc?.name ?? 'none active',
                  note:
                    active.alloc == null
                      ? 'Nothing tells the daemon what to run, so every plan runs outside the rules.'
                      : `${(active.alloc.strategy_opportunity_ids ?? []).length} opportunities · max ${active.alloc.max_positions ?? '—'} positions`,
                  lamp: active.alloc == null ? ('yellow' as const) : ('green' as const),
                },
                {
                  k: 'Gate',
                  v: active.gate ? `${active.gate.name} · v${active.gate.version}` : 'none',
                  note: active.gate
                    ? 'A limit set whose scope is this allocation — its hits land on Risk › Limits.'
                    : 'Nothing bounds what runs under the active allocation.',
                  lamp: active.gate ? ('green' as const) : ('yellow' as const),
                },
                {
                  k: 'Instances',
                  v: active.unread ? 'not read' : `${active.open} open · ${chain.data.instances.length - active.open} closed`,
                  note: active.unread
                    ? 'The strategy service answered with an empty list while the rulebook has opportunities — it does that now and then and answers in full a moment later.'
                    : 'Open and closed by each instance’s own fills, the Ledger’s rule.',
                  lamp: active.unread ? ('yellow' as const) : ('green' as const),
                },
                {
                  k: 'Daemon',
                  v: hedge.alive ? `alive · hedge ${hedge.suspended ? 'suspended' : 'enabled'}` : 'not running',
                  note: hedge.paperTrade
                    ? 'paper_trade — it reports what it would do, it does not place.'
                    : 'Uses the active allocation from its next start.',
                  lamp: !hedge.alive ? ('gray' as const) : hedge.suspended ? ('yellow' as const) : ('green' as const),
                },
              ].map((r) => (
                <div key={r.k} className="min-w-0 border-r border-border/60 px-3 py-2.5 last:border-r-0">
                  <div className={positionsUi.cap}>{r.k}</div>
                  <div className="mt-0.75 flex items-center gap-1.5 text-dense-body font-semibold text-foreground">
                    <StatusLamp lamp={r.lamp} variant="dot" />
                    <span className="min-w-0 truncate">{r.v}</span>
                  </div>
                  <div className="mt-0.5 text-dense-meta leading-normal text-muted-foreground text-pretty">
                    {r.note}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <p className="m-0 rounded-md border border-border bg-[var(--sk-raised2)] px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty">
            <span className="font-semibold text-secondary-foreground">Boundary.</span> Everything on this page reads
            except the hedge menu, which is the daemon’s own control channel and has been in the app since the Daemon
            page — moved here, not armed here. No order is sent from Bifrost: plans are copied and placed in TWS, and
            the Send action reserved on an intent is not wired. D10 governs, and it is held by the spine and the daemon
            overlays rather than by which buttons are drawn.
          </p>
        </>
      )}
    </PageShell>
  )
}
