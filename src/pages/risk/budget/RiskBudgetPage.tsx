/**
 * Risk · Budget — how much risk the book may add, per trade, per day, per week.
 *
 * The three lines are a policy the design edits in Rules and this page only
 * reads. That store does not exist on this side, so all three are unwritten —
 * and the page says unwritten rather than drawing a zero, because a cap of zero
 * would block every trade while a cap nobody wrote blocks nothing.
 *
 * What is spent against them is spent by decisions, not fills. Nothing records
 * a sizing decision here either, so the spend side is marked rather than shown
 * as zero: no spend recorded is not the same as no risk taken.
 *
 * The lines this app *does* enforce — the 85% backing gate, the concentration
 * floor, the pressure ceiling — are listed beside the three, so the page says
 * which parts of the policy exist somewhere and which exist nowhere.
 */
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { PageHeader, PageShell } from '@/components/layout'
import { DenseTag, SegmentControl } from '@/components/data-display'
import { StatusLamp } from '@/components/StatusLamp'
import { Skeleton } from '@/components/ui/skeleton'
import { positionsUi } from '@/components/positions/positionsUi'
import { PositionsTier } from '@/components/positions/PositionsTier'
import { PositionsStat } from '@/components/positions/PositionsStat'

/** Mon–Fri and today, the days the design's week band draws. */
const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'today'] as const
import { fmtPct0 } from '@/utils/positions'
import { fmtMvAbbrev } from '@/utils/positionsCharts'
import { HOUSE_GATE_PCT } from '@/utils/backingJudgment'
import { RISK_CONCENTRATION_FLOOR } from '@/utils/riskExposure'
import { usePressureCeiling } from '@/hooks/usePressureCeiling'
import { useRiskExposure } from '@/hooks/useRiskExposure'
import { fetchAllocations, fetchStrategyInstances } from '@/api/strategy'
import { useExecutionsCanonical } from '@/hooks/useExecutions'
import { readInstances } from '@/utils/strategyInstances'
import { RISK_BUDGET_UNRECORDED, UNWRITTEN_POLICY, budgetLines } from '@/utils/riskBudget'

const PAGE_LEAD =
  'How much risk the book may add — per trade, per day, per week. Spent by Sizing, refilled by the calendar. This page reads the policy; it does not set it.'

const FOOT =
  'border-t border-border bg-[var(--sk-raised2)] px-3 py-1.5 text-dense-meta leading-normal text-muted-foreground text-pretty'

export default function RiskBudgetPage() {
  const [accountFilter, setAccountFilter] = useState('all')
  const { status, statusLoading, accountIds, judgment, rows: exposure } = useRiskExposure(accountFilter)
  const { ceiling } = usePressureCeiling()

  /** The daemon's allocation — one pool with hand plans, its own gate on top. */
  const allocationsQuery = useQuery({
    queryKey: ['strategy', 'allocations'],
    queryFn: () => fetchAllocations(),
  })
  const instancesQuery = useQuery({
    queryKey: ['strategy', 'instances'],
    queryFn: () => fetchStrategyInstances(),
  })
  const execQuery = useExecutionsCanonical()
  const allocation = (allocationsQuery.data?.items ?? []).find((a) => a.is_active) ?? null
  const gateMax = allocation?.max_positions ?? null
  const gateOpen = useMemo(() => {
    if (allocation == null) return null
    const oppIds = new Set(allocation.strategy_opportunity_ids ?? [])
    return readInstances(instancesQuery.data?.items ?? [], execQuery.data?.items ?? []).filter(
      (i) => !i.closed && oppIds.has(i.opportunityId),
    ).length
  }, [allocation, instancesQuery.data?.items, execQuery.data?.items])

  const netLiquidation = useMemo(
    () =>
      (status?.portfolio?.accounts ?? [])
        .filter((a) => accountFilter === 'all' || (a.account_id ?? '').trim() === accountFilter)
        .reduce((s, a) => s + (Number(a.summary?.NetLiquidation) || 0), 0),
    [status, accountFilter],
  )

  const lines = useMemo(
    () =>
      budgetLines({
        netLiquidation: netLiquidation > 0 ? netLiquidation : null,
        policy: UNWRITTEN_POLICY,
        spentToday: null,
        spentThisWeek: null,
      }),
    [netLiquidation],
  )

  /** The week, which the design reads as spent-against-cap rather than as a third line. */
  const weekly = useMemo(() => lines.find((l) => l.key === 'weekly') ?? null, [lines])

  /** The lines that do exist somewhere, so the page is not only what is missing. */
  const enforced = useMemo(
    () => [
      {
        key: 'backing',
        name: 'Backing gate',
        value: fmtPct0(HOUSE_GATE_PCT),
        where: 'of the backing pool',
        by: { label: 'Backing & Model', to: '/portfolio/backing' },
        now: judgment?.usedPct == null ? '—' : fmtPct0(judgment.usedPct),
      },
      {
        key: 'concentration',
        name: 'Single-name share of β-Δ',
        value: fmtPct0(RISK_CONCENTRATION_FLOOR),
        where: 'per underlying',
        by: { label: 'Limits & Breaches', to: '/risk/limits' },
        now: exposure[0]?.share == null ? '—' : fmtPct0(exposure[0].share),
      },
      // Design DECISIONS 2026-09-18: one pool. The daemon's allocation spends
      // the same budget a hand plan does; what is narrower about it is its gate,
      // which is a limit at scope = allocation rather than a second budget.
      {
        key: 'daemon-book',
        name: 'Daemon book · the active allocation',
        value: gateMax == null ? 'no allocation' : `${gateMax} instances`,
        where: 'the same pool, hand and daemon alike',
        by: { label: 'Trade › Rules', to: '/trade/rules' },
        now: gateOpen == null ? '—' : `${gateOpen} open`,
      },
      {
        key: 'pressure',
        name: 'Pressure ceiling',
        value: fmtPct0(ceiling),
        where: 'the broker’s cushion, set by the Owner',
        by: { label: 'Backing & Model', to: '/portfolio/backing' },
        now: '—',
      },
    ],
    [judgment, exposure, ceiling],
  )

  return (
    <PageShell padding="compact" className="space-y-3">
      <section className={positionsUi.pageCard} aria-label="Risk Budget">
        <PageHeader
          breadcrumb={<p className="text-xs text-primary/90 font-medium">Risk / Budget</p>}
          title="Risk Budget"
          titleSize="large"
          description={PAGE_LEAD}
          actions={
            <span className="flex flex-wrap items-center gap-2.5">
              {accountIds.length > 1 ? (
                <SegmentControl
                  size="xs"
                  ariaLabel="Account"
                  value={accountFilter}
                  onChange={setAccountFilter}
                  options={[{ value: 'all', label: 'All' }, ...accountIds.map((a) => ({ value: a, label: a }))]}
                />
              ) : null}
              <DenseTag variant="warning" size="cell">
                ⚠ no policy is written
              </DenseTag>
              <Link to="/risk/sizing" className={positionsUi.link}>
                Sizing →
              </Link>
              <Link to="/trade/rules" className={positionsUi.link}>
                Edit policy in Rules →
              </Link>
            </span>
          }
        />

        {statusLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-24 w-full rounded-md" />
            <Skeleton className="h-48 w-full rounded-md" />
          </div>
        ) : (
          <>
            <section className={cn(positionsUi.panel, 'border-warning/40')} aria-label="The three lines">
              <header className={positionsUi.panelHead}>
                <span className={positionsUi.cap}>The lines</span>
                <span className={positionsUi.panelTitle}>none of the three is written</span>
                <DenseTag variant="warning" size="cell">
                  ⚠ no line, nothing spent
                </DenseTag>
                <span className="ml-auto text-dense-meta text-muted-foreground">
                  a percentage of net liquidation, which is {netLiquidation > 0 ? fmtMvAbbrev(netLiquidation) : 'unread'}
                </span>
              </header>
              {/* The design's five, in its order: the per-trade line, the day's
                  line, what the day has spent, what it has left, and — apart on
                  the right — the week as spent against its own cap. The weekly
                  line is that last cell rather than a fourth line of its own,
                  which is how the design reads it. */}
              <div className="flex flex-wrap items-start gap-x-7 gap-y-2 px-3 py-2.5">
                {lines
                  .filter((l) => l.key !== 'weekly')
                  .map((l) => (
                    <PositionsStat
                      key={l.key}
                      cap={l.label}
                      value={l.amount == null ? 'unwritten' : fmtMvAbbrev(l.amount)}
                      ink={l.amount == null ? 'text-muted-foreground' : undefined}
                      sub={
                        l.noLine
                          ? `${l.scope} · ${l.noLine}`
                          : `${l.scope} · ${l.pct == null ? '' : fmtPct0(l.pct)} of net liq`
                      }
                    />
                  ))}
                <PositionsStat
                  cap="Spent today"
                  value="—"
                  ink="text-muted-foreground"
                  sub="nothing records a sizing decision"
                />
                <PositionsStat
                  cap="Left today"
                  value="—"
                  ink="text-muted-foreground"
                  sub="neither side of the subtraction exists"
                />
                <span className="ml-auto flex">
                  <PositionsStat
                    cap="Week"
                    value={weekly?.spent == null ? '—' : fmtMvAbbrev(weekly.spent)}
                    ink="text-muted-foreground"
                    sub={
                      weekly?.amount == null
                        ? `Mon–today · weekly cap ${weekly?.noLine ?? 'unwritten'}`
                        : `Mon–today · weekly cap ${fmtMvAbbrev(weekly.amount)}`
                    }
                  />
                </span>
              </div>
              <p className={cn(FOOT, 'm-0')}>{RISK_BUDGET_UNRECORDED.policy}</p>
            </section>

            <PositionsTier
              label="What is spent"
              note="a decision reserves its max loss the moment it leaves Sizing — not when it fills"
            />
            <section className={cn(positionsUi.panel, 'border-warning/40')} aria-label="Spent today">
              <header className={positionsUi.panelHead}>
                <span className={positionsUi.cap}>Spent today</span>
                <span className={positionsUi.panelTitle}>no decision is recorded</span>
                <DenseTag variant="warning" size="cell">
                  ⚠ nothing writes a sizing decision
                </DenseTag>
              </header>
              <div className="overflow-x-auto">
                {/* §14.6: six columns, the design's 860 floor. */}
                <table className="w-full min-w-[860px] table-fixed border-collapse">
                  <colgroup>
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '24%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '16%' }} />
                    <col style={{ width: '14%' }} />
                    <col style={{ width: '24%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className={cn(positionsUi.th, 'text-left')}>When</th>
                      <th className={cn(positionsUi.th, 'text-left')}>Trade</th>
                      <th className={positionsUi.th}>Size</th>
                      <th className={positionsUi.th}>Risk taken</th>
                      <th className={positionsUi.th}>Cum.</th>
                      <th className={cn(positionsUi.th, 'text-left')}>Against budget</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className={cn(positionsUi.td, 'pl-2 text-left font-sans whitespace-normal')} colSpan={6}>
                        <span className="inline-flex items-start gap-1.5 text-dense-meta leading-normal text-muted-foreground">
                          <StatusLamp lamp="gray" variant="dot" title="No row" className="mt-1 shrink-0" />
                          The amounts here are max loss at entry, not premium — and nothing on this side writes one.
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className={cn(FOOT, 'm-0')}>{RISK_BUDGET_UNRECORDED.spend}</p>
            </section>

            {/* The design puts this beside the spend table: five days and today,
                each against the day's cap. Both sides of every bar are missing
                here — the cap is unwritten and no decision is recorded — so the
                days are drawn and named, and the bars are left empty rather
                than filled to a length nobody measured. */}
            <section className={cn(positionsUi.panel, 'border-warning/40')} aria-label="This week">
              <header className={positionsUi.panelHead}>
                <span className={positionsUi.cap}>This week</span>
                <span className={positionsUi.panelTitle}>daily spend vs cap</span>
                <DenseTag variant="warning" size="cell">
                  ⚠ neither side of the bar exists
                </DenseTag>
                <span className="ml-auto text-dense-meta text-muted-foreground">
                  velocity limits live on Limits &amp; Breaches
                </span>
              </header>
              <div className="flex flex-col gap-2 px-3 py-2.5">
                {WEEK_DAYS.map((d) => (
                  <div key={d} className="grid grid-cols-[2.75rem_minmax(0,1fr)_4rem] items-center gap-2.5">
                    <span className={cn(positionsUi.mono, 'text-dense-meta text-muted-foreground')}>{d}</span>
                    <span className="block h-1.75 overflow-hidden rounded-[3px] bg-[var(--sk-surface)]" />
                    <span className={cn(positionsUi.mono, 'text-right text-dense-meta text-muted-foreground')}>—</span>
                  </div>
                ))}
              </div>
              <p className={cn(FOOT, 'm-0')}>
                A bar needs a day&rsquo;s spend and the day&rsquo;s cap. Neither is written on this side, so the week
                shows its shape and no lengths — a filled bar here would be the page inventing the very number it
                exists to watch.
              </p>
            </section>

            <PositionsTier label="Policy" note="where these numbers would come from, and which of them exist" />
            <section className={positionsUi.panel} aria-label="Policy">
              <header className={positionsUi.panelHead}>
                <span className={positionsUi.panelTitle}>3 lines unwritten · {enforced.length} enforced elsewhere</span>
                <span className="ml-auto text-dense-meta text-muted-foreground">
                  the design edits all of these in Trade › Rules
                </span>
              </header>
              <div className="overflow-x-auto">
                {/* §14.6: five columns, a 780 floor. */}
                <table className="w-full min-w-[780px] table-fixed border-collapse">
                  <colgroup>
                    <col style={{ width: '28%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '26%' }} />
                    <col style={{ width: '22%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className={cn(positionsUi.th, 'text-left')}>Line</th>
                      <th className={positionsUi.th}>Set at</th>
                      <th className={positionsUi.th}>Now</th>
                      <th className={cn(positionsUi.th, 'text-left')}>Scope</th>
                      <th className={cn(positionsUi.th, 'text-left')}>Enforced by</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l) => (
                      <tr key={l.key} className="hover:[&>td]:bg-[var(--sk-raised2)]">
                        <td className={cn(positionsUi.td, 'pl-2 text-left font-sans text-foreground')}>{l.label}</td>
                        <td className={cn(positionsUi.td, 'text-muted-foreground')}>unwritten</td>
                        <td className={cn(positionsUi.td, 'text-muted-foreground')}>—</td>
                        <td className={cn(positionsUi.td, 'text-left font-sans text-muted-foreground')}>{l.scope}</td>
                        <td className={cn(positionsUi.td, 'text-left font-sans text-muted-foreground')}>
                          <span className="inline-flex items-center gap-1.5">
                            <StatusLamp lamp="gray" variant="dot" title="Nothing" />
                            nothing — the store is missing
                          </span>
                        </td>
                      </tr>
                    ))}
                    {enforced.map((e) => (
                      <tr key={e.key} className="hover:[&>td]:bg-[var(--sk-raised2)]">
                        <td className={cn(positionsUi.td, 'pl-2 text-left font-sans text-foreground')}>{e.name}</td>
                        <td className={cn(positionsUi.td, 'text-secondary-foreground')}>{e.value}</td>
                        <td className={cn(positionsUi.td, 'text-foreground')}>{e.now}</td>
                        <td className={cn(positionsUi.td, 'text-left font-sans text-muted-foreground')}>{e.where}</td>
                        <td className={cn(positionsUi.td, 'text-left font-sans')}>
                          <Link to={e.by.to} className={positionsUi.link}>
                            {e.by.label} →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className={cn(FOOT, 'm-0')}>
                The three risk-budget lines exist nowhere; the ones below them exist and are read on the pages named.
                That is the whole difference between a policy this app enforces and one the design has only drawn. The
                daemon&rsquo;s allocation is on that list because it spends this same budget — one pool, hand and
                daemon alike. What is narrower about it is its <em>gate</em>, which is a limit at scope = allocation
                rather than a second budget: defined in Trade › Rules, its hits land on Limits &amp; Breaches.
              </p>
            </section>

            <p className="m-0 rounded-md border border-border bg-[var(--sk-raised2)] px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty">
              <span className="font-semibold text-secondary-foreground">Boundary.</span> This page writes nothing. The
              budget is spent by{' '}
              <Link to="/risk/sizing" className={positionsUi.link}>
                Sizing
              </Link>{' '}
              and its velocity breaches are read on{' '}
              <Link to="/risk/limits" className={positionsUi.link}>
                Limits &amp; Breaches
              </Link>
              ; the lines themselves are edited in a Rules engine that does not exist yet.
            </p>
          </>
        )}
      </section>
    </PageShell>
  )
}
