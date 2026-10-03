/**
 * Risk · Sizing — how big, and how much room is left (design Rev .107: Budget
 * merged in; `/risk/budget` lands on the Today section).
 *
 * The design's order: five readings → the worksheet → Why this size · Today ·
 * This week · Policy. Its rule is the whole page: `n = min(four caps)`, and an
 * override may only size down — sizing up means changing the cap in Rules.
 *
 * What is real here and what is not:
 *  - Headroom to gate (Backing & Model's room to the 85% gate), the
 *    concentration ceiling (Exposure's β-Δ share, held on Limits) and the gate
 *    cap (the active allocation's room) are read.
 *  - The three budget lines — per trade, per day, per week — are a policy the
 *    design edits in Rules, and this side has no store for it: unwritten, not
 *    zero.
 *  - Today and This week are the fills, at max loss (`sizingTodayModel`):
 *    nothing records a sizing *decision*, so Suggested says unrecorded, but
 *    what was taken is measured, not left blank.
 *  - The worksheet has no rows: nothing stores a sized candidate — Compare
 *    hands its structures on as a Plan.
 */
import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useLocation } from 'react-router-dom'
import { ViewState } from '@bifrost/ui'
import { cn } from '@/lib/utils'
import { HeroCard, HeroRow, PageHead, PageHeadLink, PageShell } from '@/components/layout'
import { DenseTag } from '@/components/data-display'
import { StatusLamp } from '@/components/StatusLamp'
import { positionsUi } from '@/components/positions/positionsUi'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { usePreviewState } from '@/hooks/usePreviewState'
import { usePressureCeiling } from '@/hooks/usePressureCeiling'
import { failedDetail, sourceState, staleDetail } from '@/lib/viewState'
import { inAccountScope, scopeAccountId, useAccountScope } from '@/lib/accountScope'
import { scrollWhenPresent, flashFound } from '@/lib/scrollWhenPresent'
import { fmtPct0 } from '@/utils/positions'
import { fmtMvAbbrev } from '@/utils/positionsCharts'
import { HOUSE_GATE_PCT } from '@/utils/backingJudgment'
import { fetchAllocations, fetchTrades } from '@/api/strategy'
import { useExecutionsAll } from '@/hooks/useExecutions'
import { readTrades } from '@/utils/tradeReadings'
import { RISK_CONCENTRATION_FLOOR } from '@/utils/riskExposure'
import { useRiskExposure } from '@/hooks/useRiskExposure'
import { RISK_BUDGET_UNRECORDED } from '@/utils/riskBudget'
import { nyDate, takenToday, weekOf } from './sizingTodayModel'
import { QUERY_KEYS } from '@/constants/queryKeys'

const PAGE_LEAD =
  'How big, and how much room is left. Four caps per candidate, the smallest wins; the risk cap spends a per-trade, per-day and per-week budget that the calendar refills. Candidates arrive from Compare and Plans; the gate cap reads the active allocation in Trading › Rules.'

const FOOT = 'm-0 border-t border-border px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty'
const GRID = 'grid grid-cols-[repeat(auto-fit,minmax(min(100%,26.25rem),1fr))] items-start gap-3'
const TRACK = 'bg-[color-mix(in_srgb,var(--sk-ink)_8%,transparent)]'
const TICKER = 'font-mono font-bold tabular-nums text-[var(--sk-ticker)]'
const CONTRACT = 'font-mono text-dense-meta tabular-nums text-[var(--sk-contract)]'

const CAPS = [
  { key: 'risk', label: 'Risk budget', math: 'per-trade line ÷ max loss per contract' },
  { key: 'margin', label: 'Margin', math: 'room to the backing gate ÷ margin per contract' },
  { key: 'concentration', label: 'Concentration', math: 'the contracts that keep the name inside its share of β-Δ$' },
  { key: 'gate', label: 'Gate (allocation)', math: 'room left under the active allocation’s gate' },
] as const

const usd = fmtMvAbbrev

export default function RiskSizingPage() {
  const scope = useAccountScope()
  const statusQ = useMonitorStatus()
  const host = statusQ.data?.config?.ib_client?.account?.event_host ?? ''
  const secondary = statusQ.data?.config?.ib_client?.account?.event_secondary ?? ''
  const accountFilter = scopeAccountId(scope, host, secondary) ?? 'all'
  const { status, judgment, rows: exposure } = useRiskExposure(accountFilter)
  const preview = usePreviewState()
  const { ceiling } = usePressureCeiling()
  const location = useLocation()

  // `/risk/budget` is an alias of this page (Rev .107): land on Today.
  useEffect(() => {
    if (location.hash !== '#budget') return
    return scrollWhenPresent('#budget', 5_000, flashFound)
  }, [location.hash])

  const allocationsQuery = useQuery({ queryKey: ['strategy', 'allocations'], queryFn: () => fetchAllocations() })
  const tradesQuery = useQuery({ queryKey: QUERY_KEYS.trades.list, queryFn: () => fetchTrades() })
  const execQuery = useExecutionsAll()
  const allocation = (allocationsQuery.data?.items ?? []).find((a) => a.is_active) ?? null
  const gateOpen = useMemo(() => {
    if (allocation == null) return null
    const oppIds = new Set(allocation.strategy_opportunity_ids ?? [])
    return readTrades(tradesQuery.data?.items ?? [], execQuery.data?.items ?? []).filter(
      (i) => !i.closed && oppIds.has(i.opportunityId),
    ).length
  }, [allocation, tradesQuery.data?.items, execQuery.data?.items])
  const gateMax = allocation?.max_positions ?? null
  const gateRoom = gateOpen == null || gateMax == null ? null : Math.max(0, gateMax - gateOpen)

  const netLiquidation = useMemo(
    () =>
      (status?.portfolio?.accounts ?? [])
        .filter((a) => accountFilter === 'all' || (a.account_id ?? '').trim() === accountFilter)
        .reduce((s, a) => s + (Number(a.summary?.NetLiquidation) || 0), 0),
    [status, accountFilter],
  )

  // The New York date, read once per mount — a page left open overnight keeps the day it opened on.
  const [today] = useState(() => nyDate(Date.now() / 1000))
  const fills = useMemo(
    () => (execQuery.data?.items ?? []).filter((e) => inAccountScope(e.account_id, scope, host, secondary)),
    [execQuery.data?.items, scope, host, secondary],
  )
  const taken = useMemo(() => takenToday(fills, today), [fills, today])
  const week = useMemo(() => weekOf(fills, today), [fills, today])
  const takenTotal = taken[0]?.cum ?? 0
  const weekTotal = week.reduce((n, d) => n + d.risk, 0)
  const weekMax = Math.max(0, ...week.map((d) => d.risk))

  const topName = exposure[0] ?? null
  const overCeiling = topName?.share != null && topName.share > RISK_CONCENTRATION_FLOOR

  const capReadings: Record<(typeof CAPS)[number]['key'], { note: string; n: number | null }> = {
    risk: { note: 'No per-trade line is written, so this cap bounds nothing.', n: null },
    margin: {
      note:
        judgment?.spendable == null
          ? 'The backing pool did not price, so the room to the gate is unread.'
          : `${usd(judgment.spendable)} to the ${fmtPct0(HOUSE_GATE_PCT)} gate — the ceiling needs a margin per contract.`,
      n: null,
    },
    concentration: {
      note:
        topName?.share == null
          ? 'No name carries a β-weighted Δ$, so no share can be taken.'
          : overCeiling
            ? `${topName.symbol} is at ${fmtPct0(topName.share)} of ${fmtPct0(RISK_CONCENTRATION_FLOOR)} — nothing more in that name today.`
            : `${topName.symbol} is the largest at ${fmtPct0(topName.share)} of ${fmtPct0(RISK_CONCENTRATION_FLOOR)}.`,
      n: overCeiling ? 0 : null,
    },
    gate: {
      note:
        gateRoom == null
          ? 'No allocation is active, so no gate applies — a hand plan is under none either way.'
          : `${allocation?.name} · ${gateOpen} of ${gateMax} trades open — ${gateRoom} left.`,
      n: gateRoom,
    },
  }
  const binding = capReadings.concentration.n === 0 ? 'concentration' : gateRoom === 0 ? 'gate' : null

  const policy = [
    { k: 'per trade', v: 'Unwritten — the design’s % of NLV, marked nightly. The risk cap divides by this first.' },
    { k: 'per day', v: 'Unwritten — a soft daily cap in new max loss; over it, new opens need an acknowledge.' },
    { k: 'per week', v: 'Unwritten — a hard weekly cap the Rules engine would block at.' },
    {
      k: 'daemon',
      v:
        allocation == null
          ? 'No allocation is active. When one is, it spends this same budget — one pool, hand and daemon alike.'
          : `${allocation.name} spends this same budget — one pool. Its narrower cap (${gateMax} trades) is the gate cap above.`,
    },
    {
      k: 'enforced',
      v: `What does exist: the ${fmtPct0(HOUSE_GATE_PCT)} backing gate (Backing & Model), the ${fmtPct0(RISK_CONCENTRATION_FLOOR)} single-name β-Δ share (Limits), and your ${fmtPct0(ceiling)} pressure ceiling.`,
    },
  ]

  // §17.1: the broker snapshot every cap divides is the one critical source.
  const pageState = preview === 'loading' || preview === 'failed' || preview === 'stale' ? preview : sourceState(statusQ)
  const retry = () => void statusQ.refetch()

  return (
    <PageShell padding="compact" className="space-y-3">
      <PageHead
        title="Sizing"
        info={PAGE_LEAD}
        actions={
          <>
            <PageHeadLink to="/research/compare" title="Where candidates are sized as structures">
              Compare →
            </PageHeadLink>
            <PageHeadLink to="/trade/rules" title="Edit the budget policy in Rules">
              Rules →
            </PageHeadLink>
          </>
        }
      />

      {pageState === 'stale' ? (
        <ViewState
          kind="stale"
          title="Couldn’t refresh sizing inputs"
          detail={staleDetail(statusQ, 'room and trades since then are not reflected.')}
          onAction={retry}
        />
      ) : null}
      {pageState === 'loading' ? (
        <section className={positionsUi.panel}>
          <ViewState kind="loading" title="Loading sizing inputs" rows={8} cols={6} />
        </section>
      ) : pageState === 'failed' ? (
        <section className={positionsUi.panel}>
          <ViewState
            kind="failed"
            title="Couldn’t load sizing inputs"
            detail={failedDetail(statusQ, 'No size and no budget room was computed — no budget shown is not the same as budget left.')}
            onAction={retry}
          />
        </section>
      ) : (
        <>
          <HeroRow label="Sizing readings">
            <HeroCard
              label="Per trade"
              value="unwritten"
              valueClassName="text-muted-foreground"
              title={RISK_BUDGET_UNRECORDED.policy}
              sub={`no line · of NLV ${netLiquidation > 0 ? usd(netLiquidation) : 'unread'}`}
            />
            <HeroCard
              label="Left today"
              value="—"
              valueClassName="text-muted-foreground"
              sub={`no daily cap written · ${usd(takenTotal)} taken today`}
            />
            <HeroCard
              label="Week"
              value={usd(weekTotal)}
              sub="Mon–today at max loss · weekly cap unwritten"
            />
            <HeroCard
              label="Headroom to gate"
              value={judgment?.spendable == null ? '—' : usd(judgment.spendable)}
              valueClassName={judgment?.overGate ? 'text-warning' : 'text-foreground'}
              state={judgment?.overGate ? 'warn' : null}
              sub={
                <>
                  backing gate {fmtPct0(HOUSE_GATE_PCT)} ·{' '}
                  <Link to="/portfolio/backing" className={positionsUi.link}>
                    Backing →
                  </Link>
                </>
              }
            />
            <HeroCard
              label="Concentration ceiling"
              value={fmtPct0(RISK_CONCENTRATION_FLOOR)}
              state={overCeiling ? 'danger' : null}
              sub={
                <>
                  {topName?.share == null
                    ? 'no name carries a β-Δ$'
                    : overCeiling
                      ? `${topName.symbol} already over`
                      : `${topName.symbol} at ${fmtPct0(topName.share)}`}{' '}
                  ·{' '}
                  <Link to="/risk/limits" className={positionsUi.link}>
                    Limits →
                  </Link>
                </>
              }
            />
          </HeroRow>

          <section className={positionsUi.panel} aria-label="Sizing worksheet">
            <header className={positionsUi.panelHead}>
              <span className={positionsUi.cap}>Sizing worksheet</span>
              <span className={positionsUi.panelTitle}>0 candidates</span>
              <span className="text-dense-meta text-muted-foreground">
                n = min(four caps) · ± overrides down only — overriding up needs the cap itself changed in Rules
              </span>
            </header>
            <div className="overflow-x-auto">
              <table data-sr-table="" className="w-full">
                <thead>
                  <tr>
                    <th data-sr-col="entity">Candidate</th>
                    <th data-sr-col="num">Max loss /1</th>
                    <th data-sr-col="num">Margin /1</th>
                    <th data-sr-col="num">n by risk</th>
                    <th data-sr-col="num">n by margin</th>
                    <th data-sr-col="num">n by conc.</th>
                    <th data-sr-col="num">n by gate</th>
                    <th data-sr-col="tag">Binding</th>
                    <th data-sr-col="num">Size</th>
                    <th data-sr-col="num">Total at risk</th>
                    <th data-sr-col="tag" />
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={11} data-sr-col="wrap">
                      <span className="inline-flex items-start gap-1.5 text-dense-meta leading-normal text-muted-foreground">
                        <StatusLamp lamp="gray" variant="dot" title="No candidate" className="mt-1 shrink-0" />
                        No candidate reaches this page:{' '}
                        <Link to="/research/compare" className={positionsUi.link}>
                          Compare
                        </Link>{' '}
                        sizes its structures and hands them on as a Plan, and nothing stores a sized candidate for this
                        worksheet to read. An empty worksheet is an empty inbox, not a quiet book.
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <div className={GRID}>
            <section className={positionsUi.panel} aria-label="Why this size">
              <header className={positionsUi.panelHead}>
                <span className={positionsUi.cap}>Why this size</span>
                <span className={positionsUi.panelTitle}>no candidate picked</span>
                <span className="ml-auto text-dense-meta text-muted-foreground">the smallest cap wins</span>
              </header>
              <div className="flex flex-col gap-3 p-3">
                {CAPS.map((c) => {
                  const reading = capReadings[c.key]
                  const binds = binding === c.key
                  return (
                    <div
                      key={c.key}
                      className={cn(
                        'grid grid-cols-[7.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2.5 py-2',
                        binds
                          ? 'bg-[color-mix(in_srgb,var(--sk-warn)_10%,transparent)]'
                          : 'bg-[var(--card-fill)]',
                      )}
                    >
                      <span className={cn('text-dense-meta font-semibold', binds ? 'text-[var(--sk-warn)]' : 'text-muted-foreground')}>
                        {c.label}
                      </span>
                      <span className="text-dense-meta leading-normal text-secondary-foreground text-pretty">
                        <span className="text-muted-foreground">{c.math}.</span> {reading.note}
                      </span>
                      <span
                        className={cn(
                          'font-mono text-sm font-bold tabular-nums',
                          reading.n == null ? 'text-muted-foreground' : binds ? 'text-[var(--sk-warn)]' : 'text-foreground',
                        )}
                      >
                        n ≤ {reading.n ?? '—'}
                      </span>
                    </div>
                  )
                })}
                <p className="m-0 text-dense-meta leading-normal text-muted-foreground text-pretty">
                  A cap that cannot be computed is never treated as unlimited. With a candidate on the worksheet, the
                  risk and margin caps divide its max loss and margin per contract.
                </p>
              </div>
            </section>

            <section className={positionsUi.panel} id="budget" aria-label="Today">
              <header className={positionsUi.panelHead}>
                <span className={positionsUi.cap}>Today</span>
                <span className={positionsUi.panelTitle}>
                  {taken.length} {taken.length === 1 ? 'fill' : 'fills'} · {usd(takenTotal)} at max loss
                </span>
                <span className="ml-auto text-dense-meta text-muted-foreground">
                  outcomes graded in{' '}
                  <Link to="/review" className={positionsUi.link}>
                    Review →
                  </Link>
                </span>
              </header>
              <div className="overflow-x-auto">
                <table data-sr-table="" className="w-full">
                  <thead>
                    <tr>
                      <th data-sr-col="entity">When</th>
                      <th data-sr-col="tag">Trade</th>
                      <th data-sr-col="num" title="Nothing records a sizing decision on this side">
                        Suggested
                      </th>
                      <th data-sr-col="num">Taken</th>
                      <th data-sr-col="num">Risk taken</th>
                      <th data-sr-col="num">Cum.</th>
                      <th data-sr-col="tag">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taken.length === 0 ? (
                      <tr>
                        <td colSpan={7} data-sr-col="wrap" className="text-dense-meta text-muted-foreground">
                          No fill today in this account scope.
                        </td>
                      </tr>
                    ) : (
                      taken.map((row) => (
                        <tr key={row.key}>
                          <td data-sr-col="entity" className="text-dense-meta text-muted-foreground">
                            {row.time == null
                              ? '—'
                              : new Date(row.time * 1000).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: false,
                                  timeZone: 'America/New_York',
                                })}
                          </td>
                          <td data-sr-col="tag">
                            <span className={TICKER}>{row.symbol}</span> <span className={CONTRACT}>{row.contract}</span>
                          </td>
                          <td data-sr-col="num" className="text-muted-foreground" title="Nothing records the suggested size">
                            —
                          </td>
                          <td data-sr-col="num" className="font-semibold">
                            {row.taken}
                          </td>
                          <td data-sr-col="num" className={cn('font-semibold', row.risk ? 'text-foreground' : 'text-muted-foreground')}>
                            {row.risk == null ? '—' : row.risk === 0 ? '—' : usd(row.risk)}
                          </td>
                          <td data-sr-col="num" className="text-muted-foreground">
                            <span className="inline-flex items-center justify-end gap-2">
                              <span
                                className={cn('inline-block h-1 w-12 overflow-hidden rounded-sm', TRACK)}
                                title="No daily cap is written, so there is no line to fill against"
                              />
                              {usd(row.cum)}
                            </span>
                          </td>
                          <td data-sr-col="tag" className="text-dense-meta text-muted-foreground">
                            {row.note}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <p className={FOOT}>
                Budget is spent on decisions, not fills, at max loss rather than premium. Nothing records a sizing
                decision here, so the rows are what was taken — Suggested stays unrecorded, and the Cum. bars stay empty
                until a daily cap is written. Closes and derisks never consume budget.
              </p>
            </section>

            <section className={positionsUi.panel} aria-label="This week">
              <header className={positionsUi.panelHead}>
                <span className={positionsUi.cap}>This week</span>
                <span className={positionsUi.panelTitle}>daily risk taken</span>
              </header>
              <div className="flex flex-col gap-2 p-3">
                {week.map((d) => (
                  <div key={d.date} className="grid grid-cols-[2.75rem_minmax(0,1fr)_4rem] items-center gap-2.5">
                    <span className={cn('font-mono text-dense-meta', d.today ? 'text-foreground' : 'text-muted-foreground')}>
                      {d.label}
                    </span>
                    <span className={cn('block h-1.75 overflow-hidden rounded', TRACK)}>
                      <span
                        className={cn('block h-full', d.today ? 'bg-foreground' : 'bg-[var(--sk-line2)]')}
                        style={{ width: weekMax > 0 ? `${Math.round((d.risk / weekMax) * 100)}%` : '0%' }}
                      />
                    </span>
                    <span className={cn('text-right font-mono text-dense-meta', d.today ? 'text-foreground' : 'text-muted-foreground')}>
                      {d.risk === 0 ? '—' : usd(d.risk)}
                    </span>
                  </div>
                ))}
                <p className="m-0 border-t border-border pt-2 text-dense-meta leading-normal text-muted-foreground text-pretty">
                  Bars are scaled to the week’s largest day — no daily cap is written to measure against. Velocity
                  limits live in{' '}
                  <Link to="/risk/limits" className={positionsUi.link}>
                    Limits
                  </Link>
                  .
                </p>
              </div>
            </section>

            <section className={positionsUi.panel} aria-label="Policy">
              <header className={positionsUi.panelHead}>
                <span className={positionsUi.cap}>Policy</span>
                <span className={positionsUi.panelTitle}>where these numbers come from</span>
                <DenseTag variant="warning" size="cell" title={RISK_BUDGET_UNRECORDED.policy}>
                  ⚠ 3 lines unwritten
                </DenseTag>
                <Link to="/trade/rules" className={cn(positionsUi.link, 'ml-auto')}>
                  edit in Rules →
                </Link>
              </header>
              <div className="flex flex-col gap-2 p-3">
                {policy.map((p) => (
                  <div key={p.k} className="grid grid-cols-[6rem_minmax(0,1fr)] items-baseline gap-2.5">
                    <span className="font-mono text-dense-meta font-bold text-secondary-foreground">{p.k}</span>
                    <span className="text-xs leading-normal text-muted-foreground text-pretty">{p.v}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </PageShell>
  )
}
