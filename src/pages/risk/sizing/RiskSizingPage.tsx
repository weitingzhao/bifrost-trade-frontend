/**
 * Risk · Sizing — how big, in four caps, the smallest of which wins.
 *
 * The design's rule is the whole page: `n = min(risk cap, margin cap,
 * concentration cap)`, and an override may only size *down* — sizing up means
 * changing the cap itself, in Rules.
 *
 * Two of the four caps are real here. The margin cap is the room to the 85%
 * backing gate, which Backing & Model computes and this page cites; the
 * concentration cap is the share of β-weighted Δ$ one name may carry, which
 * Exposure computes and Limits holds against its line — and on this book the
 * largest name is already over it, so that cap currently allows nothing. The
 * risk cap has no line written at all.
 *
 * The worksheet itself has no rows, and for a reason that is not "the book is
 * quiet": candidates reach this page from Compare, which is not built, and from
 * Plans, where nothing is intended. The page says which, rather than showing an
 * empty table that reads as "nothing worth sizing".
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
import { fmtPct0 } from '@/utils/positions'
import { fmtMvAbbrev } from '@/utils/positionsCharts'
import { HOUSE_GATE_PCT } from '@/utils/backingJudgment'
import { fetchAllocations, fetchStrategyInstances } from '@/api/strategy'
import { useExecutionsCanonical } from '@/hooks/useExecutions'
import { readInstances } from '@/utils/strategyInstances'
import { RISK_CONCENTRATION_FLOOR } from '@/utils/riskExposure'
import { useRiskExposure } from '@/hooks/useRiskExposure'
import { RISK_BUDGET_UNRECORDED } from '@/utils/riskBudget'

const PAGE_LEAD =
  'How big — four caps per candidate, and the smallest wins. Candidates arrive from Compare and from Plans; nothing is sized here without one. The gate cap reads the active allocation in Trade › Rules, and does not apply to a hand plan, which is under no allocation.'

const FOOT =
  'border-t border-border bg-[var(--sk-raised2)] px-3 py-1.5 text-dense-meta leading-normal text-muted-foreground text-pretty'

const CAPS = [
  {
    key: 'risk',
    label: 'Risk cap',
    math: 'n ≤ per-trade risk line ÷ max loss per contract',
  },
  {
    key: 'margin',
    label: 'Margin cap',
    math: 'n ≤ room to the backing gate ÷ margin per contract',
  },
  {
    key: 'concentration',
    label: 'Concentration cap',
    math: 'n ≤ the contracts that keep the name inside its share of β-Δ$',
  },
  {
    key: 'gate',
    label: 'Gate cap',
    math: 'n ≤ the room left under the active allocation’s gate · Trade › Rules',
  },
] as const

export default function RiskSizingPage() {
  const [accountFilter, setAccountFilter] = useState('all')
  const { status, statusLoading, accountIds, judgment, rows: exposure } = useRiskExposure(accountFilter)

  /**
   * The fourth cap (design DECISIONS 2026-09-18): room under the active
   * allocation's gate. It is a real, stored line — unlike the risk cap, which
   * nobody has written — and it applies only to a candidate an opportunity
   * covers. A hand plan is under no allocation and the cap is silent for it.
   */
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
  const gateOpen = useMemo(() => {
    if (allocation == null) return null
    const oppIds = new Set(allocation.strategy_opportunity_ids ?? [])
    return readInstances(instancesQuery.data?.items ?? [], execQuery.data?.items ?? []).filter(
      (i) => !i.closed && oppIds.has(i.opportunityId),
    ).length
  }, [allocation, instancesQuery.data?.items, execQuery.data?.items])
  const gateMax = allocation?.max_positions ?? null
  const gateName = allocation?.name ?? null
  const gateRoom = gateOpen == null || gateMax == null ? null : Math.max(0, gateMax - gateOpen)

  const netLiquidation = useMemo(
    () =>
      (status?.portfolio?.accounts ?? [])
        .filter((a) => accountFilter === 'all' || (a.account_id ?? '').trim() === accountFilter)
        .reduce((s, a) => s + (Number(a.summary?.NetLiquidation) || 0), 0),
    [status, accountFilter],
  )

  const topName = exposure[0] ?? null
  const overCeiling = topName?.share != null && topName.share > RISK_CONCENTRATION_FLOOR

  /**
   * What each cap reads today, and the ceiling it yields.
   *
   * Only the gate is candidate-independent: it counts instances open under the
   * active allocation against that allocation's own `max_positions`, so it has
   * a number with no candidate on the page. The other three divide by a max
   * loss or a margin per contract, which a candidate carries — so they read
   * their line and say what the ceiling waits on, rather than printing one.
   */
  const capReadings: Record<(typeof CAPS)[number]['key'], { note: string; n: number | null }> = {
    risk: { note: 'No per-trade risk line is written, so this cap bounds nothing — Risk Budget.', n: null },
    margin: {
      note:
        judgment?.spendable == null
          ? 'The backing pool did not price, so the room to the gate is unread.'
          : `${fmtMvAbbrev(judgment.spendable)} to the ${fmtPct0(HOUSE_GATE_PCT)} gate — the ceiling needs a margin per contract.`,
      n: null,
    },
    concentration: {
      note:
        topName?.share == null
          ? 'No name carries a β-weighted Δ$, so no share can be taken.'
          : overCeiling
            ? `${topName.symbol} is at ${fmtPct0(topName.share)} of ${fmtPct0(RISK_CONCENTRATION_FLOOR)} — this cap allows nothing in that name today.`
            : `${topName.symbol} is the largest at ${fmtPct0(topName.share)} of ${fmtPct0(RISK_CONCENTRATION_FLOOR)}.`,
      n: overCeiling ? 0 : null,
    },
    gate: {
      note:
        gateRoom == null
          ? 'No allocation is active, so no gate applies — a hand plan is under none either way.'
          : `${gateName} · ${gateOpen} of ${gateMax} instances open — ${gateRoom} left.`,
      n: gateRoom,
    },
  }

  return (
    <PageShell padding="compact" className="space-y-3">
      <section className={positionsUi.pageCard} aria-label="Sizing">
        <PageHeader
          breadcrumb={<p className="text-xs text-primary/90 font-medium">Risk / Sizing</p>}
          title="Sizing"
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
                ⚠ no candidate reaches this page
              </DenseTag>
              <Link to="/risk/budget" className={positionsUi.link}>
                Risk Budget →
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
            <section className={positionsUi.panel} aria-label="The four caps">
              <header className={positionsUi.panelHead}>
                <span className={positionsUi.cap}>The four caps</span>
                <span className={positionsUi.panelTitle}>
                  {judgment?.spendable == null ? 'one is readable, three have no line' : 'two are readable, two have no line'}
                </span>
                <span className="ml-auto text-dense-meta text-muted-foreground">
                  the smallest of the four is the size
                </span>
              </header>
              {/* The design's four cells, in its order: what one trade may
                  lose, what is left of today, what the broker leaves room for,
                  and the ceiling one name may not pass. Backing used is a
                  sub-line of the margin cell rather than a cell of its own, and
                  gate room lives in Why this size, which is where the design
                  reads it. */}
              <div className="flex flex-wrap items-start gap-x-6 gap-y-2 px-3 py-2.5">
                <PositionsStat
                  cap="Risk budget / trade"
                  value="unwritten"
                  ink="text-muted-foreground"
                  sub={`no line written · net liq ${netLiquidation > 0 ? fmtMvAbbrev(netLiquidation) : 'unread'}`}
                />
                <PositionsStat
                  cap="Budget left today"
                  value="—"
                  ink="text-muted-foreground"
                  sub="no daily cap written, and nothing records a sizing decision"
                />
                <PositionsStat
                  cap="Margin headroom"
                  value={judgment?.spendable == null ? '—' : fmtMvAbbrev(judgment.spendable)}
                  ink={judgment?.overGate ? 'text-warning' : undefined}
                  sub={
                    judgment?.usedPct == null
                      ? `to the ${fmtPct0(HOUSE_GATE_PCT)} backing gate`
                      : `to the ${fmtPct0(HOUSE_GATE_PCT)} backing gate · ${fmtPct0(judgment.usedPct)} of the pool used`
                  }
                />
                <span className="ml-auto flex">
                  <PositionsStat
                    cap="Concentration ceiling"
                    value={fmtPct0(RISK_CONCENTRATION_FLOOR)}
                    sub={
                      topName?.share == null
                        ? 'no name carries a β-weighted Δ$'
                        : `single-name β-Δ share · ${topName.symbol} at ${fmtPct0(topName.share)}${overCeiling ? ' — already over' : ''}`
                    }
                    ink={overCeiling ? 'text-lamp-red' : undefined}
                  />
                </span>
              </div>
              <p className={cn(FOOT, 'm-0')}>
                {overCeiling ? (
                  <>
                    The concentration cap allows nothing in {topName?.symbol} today: the name is past its share of the
                    book&rsquo;s β-weighted Δ$, so any contract that adds to it takes the share further over. That is
                    the same reading{' '}
                    <Link to="/risk/limits" className={positionsUi.link}>
                      Limits &amp; Breaches
                    </Link>{' '}
                    holds against the line — one computation, cited twice.
                  </>
                ) : (
                  <>
                    The ceiling and the backing gate are read from the pages that compute them —{' '}
                    <Link to="/risk/portfolio" className={positionsUi.link}>
                      Exposure
                    </Link>{' '}
                    and{' '}
                    <Link to="/portfolio/backing" className={positionsUi.link}>
                      Backing &amp; Model
                    </Link>{' '}
                    — never recomputed here.
                  </>
                )}
              </p>
            </section>

            <PositionsTier
              label="Sizing worksheet"
              note="n = min(four caps) · an override may size down only — sizing up means changing the cap in Rules"
            />
            <section className={cn(positionsUi.panel, 'border-warning/40')} aria-label="Sizing worksheet">
              <header className={positionsUi.panelHead}>
                <span className={positionsUi.panelTitle}>0 candidates</span>
                <DenseTag variant="warning" size="cell">
                  ⚠ nothing feeds this worksheet yet
                </DenseTag>
                <span className="ml-auto text-dense-meta text-muted-foreground">
                  a candidate carries a max loss and a margin per contract
                </span>
              </header>
              <div className="overflow-x-auto">
                {/* §14.6: eleven columns since the gate cap joined; the
                    design's floor was 1120 for ten. */}
                <table className="w-full min-w-[1220px] table-fixed border-collapse">
                  <colgroup>
                    <col style={{ width: '17%' }} />
                    <col style={{ width: '9%' }} />
                    <col style={{ width: '9%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '11%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '9%' }} />
                    <col style={{ width: '5%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className={cn(positionsUi.th, 'text-left')}>Candidate</th>
                      <th className={positionsUi.th}>Max loss /1</th>
                      <th className={positionsUi.th}>Margin /1</th>
                      <th className={positionsUi.th}>n by risk</th>
                      <th className={positionsUi.th}>n by margin</th>
                      <th className={positionsUi.th}>n by conc.</th>
                      <th className={positionsUi.th}>n by gate</th>
                      <th className={cn(positionsUi.th, 'text-left')}>Binding</th>
                      <th className={positionsUi.th}>Size</th>
                      <th className={positionsUi.th}>Total at risk</th>
                      <th className={positionsUi.th}>Plan</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className={cn(positionsUi.td, 'pl-2 text-left font-sans whitespace-normal')} colSpan={11}>
                        <span className="inline-flex items-start gap-1.5 text-dense-meta leading-normal text-muted-foreground">
                          <StatusLamp lamp="gray" variant="dot" title="No candidate" className="mt-1 shrink-0" />
                          No candidate reaches this page. Compare, which the design feeds it from, is not built on this
                          side; and{' '}
                          <Link to="/trade/plans" className={positionsUi.link}>
                            Plans
                          </Link>{' '}
                          carries nothing intended. An empty worksheet is not a quiet book — it is an empty inbox.
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className={cn(FOOT, 'm-0')}>{RISK_BUDGET_UNRECORDED.overrides}</p>
            </section>

            <div className={positionsUi.bandGrid}>
              <section className={positionsUi.panel} aria-label="Why this size">
                <header className={positionsUi.panelHead}>
                  <span className={positionsUi.cap}>Why this size</span>
                  <span className={positionsUi.panelTitle}>the smallest cap wins</span>
                </header>
                {/* The design gives each cap its live reading and the `n ≤` it
                    yields. Only the gate cap can be read without a candidate —
                    the other three need a max loss or a margin per contract —
                    so the rest carry the reading and say what the number waits
                    on rather than printing a ceiling nobody computed. */}
                {CAPS.map((c) => {
                  const reading = capReadings[c.key]
                  return (
                    <div
                      key={c.key}
                      className={cn(
                        'grid grid-cols-[7.5rem_minmax(0,1fr)_4.5rem] items-baseline gap-2.5 border-b border-border/55 px-3 py-2 last:border-b-0',
                        c.key === 'gate' && 'border-l-2 border-l-warning/60',
                      )}
                    >
                      <span className="text-dense-caption font-semibold uppercase tracking-[0.08em] text-secondary-foreground">
                        {c.label}
                      </span>
                      <span className="flex min-w-0 flex-col">
                        <span className={cn(positionsUi.mono, 'text-dense-meta leading-normal text-muted-foreground')}>
                          {c.math}
                        </span>
                        <span className="text-dense-meta leading-normal text-muted-foreground text-pretty">
                          {reading.note}
                        </span>
                      </span>
                      <span
                        className={cn(
                          positionsUi.mono,
                          'text-right text-dense-body font-semibold',
                          reading.n == null ? 'text-muted-foreground' : 'text-foreground',
                        )}
                      >
                        {reading.n == null ? 'n ≤ —' : `n ≤ ${reading.n}`}
                      </span>
                    </div>
                  )
                })}
                <p className={cn(FOOT, 'm-0')}>
                  A cap that cannot be computed is never treated as unlimited: the worksheet names it instead, because a
                  sizing tool that sizes up on missing data is worse than one that refuses.
                </p>
              </section>

              <section className={cn(positionsUi.panel, 'border-warning/40')} aria-label="Sized today">
                <header className={positionsUi.panelHead}>
                  <span className={positionsUi.cap}>Sized today</span>
                  <span className={positionsUi.panelTitle}>what was suggested, and what was taken</span>
                  <DenseTag variant="warning" size="cell">
                    ⚠ nothing records it
                  </DenseTag>
                </header>
                <p className="m-0 px-3 py-2.5 text-xs leading-normal text-secondary-foreground text-pretty">
                  The useful question is not what the caps allow — the worksheet answers that — but how often the size
                  taken differed from the size suggested, and how those trades turned out. That needs a row written
                  every time a candidate is sized.
                </p>
                <p className={cn(FOOT, 'm-0')}>{RISK_BUDGET_UNRECORDED.log}</p>
              </section>
            </div>

            <p className="m-0 rounded-md border border-border bg-[var(--sk-raised2)] px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty">
              <span className="font-semibold text-secondary-foreground">Boundary.</span> Nothing here reaches the
              broker. The design&rsquo;s → Plan button drafts a plan, not an order, and the plan still has to be placed
              by hand; with no candidate on the page there is nothing to draft.
            </p>
          </>
        )}
      </section>
    </PageShell>
  )
}
