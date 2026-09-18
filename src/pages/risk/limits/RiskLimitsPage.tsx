/**
 * Risk · Limits & Breaches — the whole limit book, and what each rule reads.
 *
 * Twelve rules in five groups, as the design draws them. Three carry a number
 * this app actually stores. Seven carry a live reading and no line, because the
 * Rules engine that would hold the lines is not built; the last two can read
 * neither side and say which half is missing. All twelve stay on the page: a
 * limit book with the unwritten rules removed would read as a complete book,
 * which is the one thing it must not do.
 *
 * Every reading is computed on the page that owns it and cited back to it
 * (§14.2) — the exposure numbers come from the same hook Portfolio Exposure
 * draws from, not from a second derivation. Nothing here writes: not a limit,
 * not an acknowledgement.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { PageHeader, PageShell } from '@/components/layout'
import { DenseTag, SegmentControl } from '@/components/data-display'
import { StatusLamp } from '@/components/StatusLamp'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { positionsUi } from '@/components/positions/positionsUi'
import { PositionsTier } from '@/components/positions/PositionsTier'
import { fmtPct0 } from '@/utils/positions'
import { fmtIsoDateToken } from '@/lib/format'
import { fmtMvAbbrev } from '@/utils/positionsCharts'
import { extractUnderlyingRootSymbol } from '@/utils/optionTicker'
import { HOUSE_GATE_PCT } from '@/utils/backingJudgment'
import { rollupMargin } from '@/utils/marginPressure'
import { usePressureCeiling } from '@/hooks/usePressureCeiling'
import { useRiskExposure } from '@/hooks/useRiskExposure'
import { useExecutionsCanonical } from '@/hooks/useExecutions'
import { readInstances } from '@/utils/strategyInstances'
import {
  fetchAllocations,
  fetchGateSafety,
  fetchGateSafetyFull,
  fetchStrategyInstances,
} from '@/api/strategy'
import { RISK_CONCENTRATION_FLOOR } from '@/utils/riskExposure'
import {
  LIMITS_UNRECORDED,
  LIMIT_GROUPS,
  gateLimitRules,
  limitRules,
  openBreaches,
  unwritten,
  watching,
  withHeadroom,
  type GateReadings,
  type LimitRow,
} from './limitsModel'

const PAGE_LEAD =
  'A hard limit is one something would act on; a soft limit asks to be acknowledged. Every reading belongs to the page that computes it — this one only holds each against a line, and writes nothing.'

const FOOT =
  'border-t border-border bg-[var(--sk-raised2)] px-3 py-1.5 text-dense-meta leading-normal text-muted-foreground text-pretty'

/** A week of fills, counted back from the newest session the book has. */
const WEEK_MS = 6 * 86_400_000

const ESCALATION: { kind: string; tone: string; what: string }[] = [
  {
    kind: 'SOFT',
    tone: 'text-warning',
    what: 'A badge, and an acknowledgement to silence it. Nothing stores the acknowledgement, so a soft breach stays visible here until the reading itself moves back inside the line.',
  },
  {
    kind: 'HARD',
    tone: 'text-lamp-red',
    what: 'Blocks the offending action at the Rules engine and lands a derisk ticket in Trade Plans. That engine is not built, so a hard breach on this page is a reading, not a block.',
  },
  {
    kind: 'AUTO',
    tone: 'text-loss',
    what: 'The backing gate only: Rules would trim the largest margin user without asking. Nothing trims anything today — the trading daemon is frozen (D10) and configured for paper trading.',
  },
]

function fmtReading(row: LimitRow, v: number | null): string {
  if (v == null) return '—'
  if (row.unit === 'pct') return fmtPct0(v)
  if (row.unit === 'usd') return fmtMvAbbrev(v)
  return String(v)
}

export default function RiskLimitsPage() {
  const [accountFilter, setAccountFilter] = useState('all')
  const { ceiling } = usePressureCeiling()
  const { status, statusLoading, accountIds, modelQueries, book, legs, rows: exposure, totals, clusters, judgment, error } =
    useRiskExposure(accountFilter)

  const margin = useMemo(
    () =>
      rollupMargin(
        (status?.portfolio?.accounts ?? []).filter(
          (a) => accountFilter === 'all' || (a.account_id ?? '').trim() === accountFilter,
        ),
      ),
    [status, accountFilter],
  )

  /** Velocity, read off the same fills Orders & Fills lists. */
  const execQuery = useExecutionsCanonical()
  const velocity = useMemo(() => {
    const dated = (execQuery.data?.items ?? []).filter((e) => (e.trade_date ?? '').length >= 8)
    if (dated.length === 0) return { contracts: null, date: null, newNames: null }
    const newest = dated.reduce((a, e) => ((e.trade_date ?? '') > a ? (e.trade_date ?? '') : a), '')
    const weekFloor = new Date(Date.parse(`${newest.slice(0, 10)}T00:00:00Z`) - WEEK_MS).toISOString().slice(0, 10)
    let contracts = 0
    const inWeek = new Set<string>()
    const before = new Set<string>()
    for (const e of dated) {
      const day = (e.trade_date ?? '').slice(0, 10)
      const symbol = extractUnderlyingRootSymbol(e.symbol)
      if (day >= weekFloor) {
        if (symbol) inWeek.add(symbol)
        if (day === newest.slice(0, 10) && (e.sec_type ?? '').toUpperCase() === 'OPT') {
          contracts += Math.abs(Number(e.quantity ?? e.qty ?? 0)) || 0
        }
      } else if (symbol) before.add(symbol)
    }
    return { contracts, date: newest.slice(0, 10), newNames: [...inWeek].filter((s) => !before.has(s)).length }
  }, [execQuery.data?.items])

  /**
   * Naked in the options sense: short puts with no long put in the same name
   * behind them. Whether what remains is cash-secured is Backing's question.
   */
  const nakedShortPuts = useMemo(() => {
    if (book.isLoading) return null
    const shortBy = new Map<string, number>()
    const longBy = new Map<string, number>()
    for (const p of book.filteredOptions) {
      if ((p.right ?? '').toUpperCase() !== 'P') continue
      const symbol = extractUnderlyingRootSymbol(p.symbol)
      const qty = Number(p.qty ?? 0)
      if (qty < 0) shortBy.set(symbol, (shortBy.get(symbol) ?? 0) + Math.abs(qty))
      else if (qty > 0) longBy.set(symbol, (longBy.get(symbol) ?? 0) + qty)
    }
    let n = 0
    for (const [symbol, short] of shortBy) n += Math.max(0, short - (longBy.get(symbol) ?? 0))
    return n
  }, [book.isLoading, book.filteredOptions])

  /**
   * The gate the daemon runs under — the only limits in this book anyone has
   * written down. Design DECISIONS 2026-09-18: a gate is a limit at scope =
   * allocation, defined in Trade › Rules and read here.
   */
  const allocationsQuery = useQuery({
    queryKey: ['strategy', 'allocations'],
    queryFn: () => fetchAllocations(),
  })
  const instancesQuery = useQuery({
    queryKey: ['strategy', 'instances'],
    queryFn: () => fetchStrategyInstances(),
  })
  const gatesQuery = useQuery({ queryKey: ['strategy', 'gate-safety'], queryFn: fetchGateSafety })

  const allocation = (allocationsQuery.data?.items ?? []).find((a) => a.is_active) ?? null
  // The allocation names its own gate; the active-gate list is the fallback for
  // an allocation that carries none.
  const gateId =
    allocation?.gate_safety_strategy_id ??
    (gatesQuery.data?.items ?? []).find((g) => g.is_active)?.gate_safety_strategy_id ??
    null
  const gateFullQuery = useQuery({
    queryKey: ['strategy', 'gate-safety', gateId],
    queryFn: () => fetchGateSafetyFull(gateId!),
    enabled: gateId != null,
  })

  const gateReadings = useMemo<GateReadings>(() => {
    const gate = gateFullQuery.data ?? null
    const guard = ((gate?.gates as Record<string, unknown> | undefined)?.guard as
      | Record<string, unknown>
      | undefined)?.risk as Record<string, unknown> | undefined
    if (allocation == null || gate == null) {
      return {
        allocationName: allocation?.name ?? null,
        gateName: gate?.name ?? null,
        gateVersion: gate?.version ?? null,
        guard: guard ?? null,
        openInstances: null,
        maxPositions: allocation?.max_positions ?? null,
        lossToday: null,
        paperTrade: typeof guard?.paper_trade === 'boolean' ? (guard.paper_trade as boolean) : null,
      }
    }
    const oppIds = new Set(allocation.strategy_opportunity_ids ?? [])
    const mine = readInstances(instancesQuery.data?.items ?? [], execQuery.data?.items ?? []).filter((i) =>
      oppIds.has(i.opportunityId),
    )
    const today = new Date().toISOString().slice(0, 10)
    const closedToday = mine.filter((i) => i.closed && i.openedOn != null)
    const todayFills = (execQuery.data?.items ?? []).filter(
      (e) => (e.trade_date ?? '').slice(0, 10) === today && e.strategy_instance_id != null,
    )
    return {
      allocationName: allocation.name,
      gateName: gate.name,
      gateVersion: gate.version,
      guard: guard ?? null,
      openInstances: mine.filter((i) => !i.closed).length,
      maxPositions: allocation.max_positions ?? null,
      // Nothing settled under the allocation today is a reading of zero loss,
      // not an absence — but only once a fill today exists to say so.
      lossToday: todayFills.length === 0 ? null : closedToday.reduce((a, i) => a + (i.realised ?? 0), 0),
      paperTrade: typeof guard?.paper_trade === 'boolean' ? (guard.paper_trade as boolean) : null,
    }
  }, [allocation, gateFullQuery.data, instancesQuery.data?.items, execQuery.data?.items])

  const rows = useMemo(
    () =>
      withHeadroom([
        ...limitRules({
          topNameShare: exposure[0]?.share ?? null,
          concentrationFloor: RISK_CONCENTRATION_FLOOR,
          clusterShare: clusters.find((c) => c.members.length > 1)?.share ?? null,
          contractsToday: velocity.contracts,
          contractsTodayDate: velocity.date ? fmtIsoDateToken(velocity.date) : null,
          newUnderlyingsThisWeek: velocity.newNames,
          buyingPowerBuffer: margin.pressure == null ? null : 1 - margin.pressure,
          bufferFloor: 1 - ceiling,
          backingUsed: judgment?.usedPct ?? null,
          backingGate: HOUSE_GATE_PCT,
          maintenanceOverNlv: margin.netLiquidation > 0 ? margin.maintMarginReq / margin.netLiquidation : null,
          netBetaDelta: totals.withBetaDelta > 0 ? totals.betaDeltaDollars : null,
          shortGamma: legs.length > 0 ? totals.gamma : null,
          nakedShortPuts,
        }),
        ...gateLimitRules(gateReadings),
      ]),
    [exposure, clusters, velocity, margin, ceiling, judgment, totals, legs.length, nakedShortPuts, gateReadings],
  )

  const breaches = openBreaches(rows)
  const near = watching(rows)
  const noLine = unwritten(rows)
  const held = rows.filter((r) => r.use != null).length
  const withLine = rows.filter((r) => r.limit != null).length


  return (
    <PageShell padding="compact" className="space-y-3">
      <section className={positionsUi.pageCard} aria-label="Limits and Breaches">
        <PageHeader
          breadcrumb={<p className="text-xs text-primary/90 font-medium">Risk / Limits &amp; Breaches</p>}
          title="Limits & Breaches"
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
              <span className={cn(positionsUi.mono, 'text-dense-meta text-muted-foreground')}>
                {rows.length} rules · {withLine} with a line
              </span>
              <Link to="/strategy/gates" className={positionsUi.link}>
                Rules engine →
              </Link>
            </span>
          }
        />

        {error ? (
          <QueryErrorAlert error={error} onRetry={() => modelQueries.forEach((q) => void q.refetch())} />
        ) : null}
        {statusLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-20 w-full rounded-md" />
            <Skeleton className="h-64 w-full rounded-md" />
          </div>
        ) : (
          <>
            <section
              className={cn(positionsUi.panel, breaches.length > 0 && 'border-lamp-red/45')}
              aria-label="Open breaches"
            >
              <header className={positionsUi.panelHead}>
                <span className={positionsUi.cap}>Open breaches</span>
                <span className={positionsUi.panelTitle}>
                  {breaches.length === 0 ? 'nothing is over a line' : `${breaches.length} open`}
                </span>
                {near.length > 0 ? (
                  <span className="inline-flex items-center gap-1.5 text-dense-meta text-warning">
                    <StatusLamp lamp="yellow" variant="dot" title="Close to the line" />
                    {near.length} close
                  </span>
                ) : null}
                <span className="ml-auto text-dense-meta text-muted-foreground">
                  computed from the readings — no queue stores it
                </span>
              </header>
              {breaches.length === 0 ? (
                <p className="m-0 px-3 py-3 text-dense-meta leading-normal text-muted-foreground text-pretty">
                  Every rule that has both a reading and a line is inside it — {held} of {rows.length}. The other{' '}
                  {rows.length - held} cannot be breached, because nothing has drawn the line.
                </p>
              ) : (
                breaches.map((r) => (
                  <div
                    key={r.key}
                    className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border/55 px-3 py-2 last:border-b-0"
                  >
                    <span className="inline-flex items-center gap-1.5 text-xs leading-normal font-semibold text-foreground">
                      <StatusLamp
                        lamp={r.kind === 'hard' ? 'red' : r.kind === 'gate' ? 'gray' : 'yellow'}
                        variant="dot"
                        title={r.kind}
                      />
                      {r.name}
                    </span>
                    <span className={cn(positionsUi.mono, 'text-xs text-warning')}>
                      {fmtReading(r, r.current)} against {fmtReading(r, r.limit)}
                    </span>
                    <span className="min-w-0 flex-[1_1_10rem] text-dense-meta leading-normal text-muted-foreground text-pretty">
                      {r.onBreach}
                    </span>
                    {r.citedFrom ? (
                      <Link to={r.citedFrom.to} className={positionsUi.link}>
                        {r.citedFrom.label} →
                      </Link>
                    ) : null}
                  </div>
                ))
              )}
              <p className={cn(FOOT, 'm-0')}>{LIMITS_UNRECORDED.ack}</p>
            </section>

            <PositionsTier
              label="All limits"
              note="headroom is the distance to the line at today’s book — a rule with no line keeps its reading and says so"
            />
            <section className={positionsUi.panel} aria-label="All limits">
              <header className={positionsUi.panelHead}>
                <span className={positionsUi.panelTitle}>{rows.length} rules · 5 groups</span>
                <span className="inline-flex items-center gap-1.5 text-dense-meta text-muted-foreground">
                  <StatusLamp lamp="gray" variant="dot" title="No line written" />
                  {noLine.length} read but have no line
                </span>
                <span className="ml-auto text-dense-meta text-muted-foreground">
                  the design edits these in the Rules engine — this page reads, never writes
                </span>
              </header>
              <div className="overflow-x-auto">
                {/* §14.6: seven columns, the design's 1040 floor. */}
                <table className="w-full min-w-[1040px] table-fixed border-collapse">
                  <colgroup>
                    <col style={{ width: '21%' }} />
                    <col style={{ width: '6%' }} />
                    <col style={{ width: '9%' }} />
                    <col style={{ width: '9%' }} />
                    <col style={{ width: '18%' }} />
                    <col style={{ width: '21%' }} />
                    <col style={{ width: '16%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className={cn(positionsUi.th, 'text-left')}>Limit</th>
                      <th className={cn(positionsUi.th, 'text-left')}>Kind</th>
                      <th className={positionsUi.th}>Current</th>
                      <th className={positionsUi.th}>Limit</th>
                      <th className={cn(positionsUi.th, 'text-left')}>Headroom</th>
                      <th className={cn(positionsUi.th, 'text-left')}>On breach</th>
                      <th className={cn(positionsUi.th, 'text-left')}>Scope</th>
                    </tr>
                  </thead>
                  <tbody>
                    {LIMIT_GROUPS.flatMap((group) => {
                      const inGroup = rows.filter((r) => r.group === group)
                      if (inGroup.length === 0) return []
                      return [
                        <tr key={group} className="bg-[var(--sk-raised2)]">
                          <td
                            className={cn(
                              positionsUi.td,
                              'pl-2 text-left font-sans text-dense-caption font-bold uppercase tracking-[0.12em] text-primary/90',
                            )}
                            colSpan={7}
                          >
                            {group}
                          </td>
                        </tr>,
                        ...inGroup.map((r) => (
                          <tr key={r.key} className="hover:[&>td]:bg-[var(--sk-raised2)]">
                            <td
                              className={cn(
                                positionsUi.td,
                                'pl-2 text-left font-sans whitespace-normal leading-normal text-foreground',
                              )}
                            >
                              {r.name}
                              {r.breached ? (
                                <span
                                  className={cn(
                                    'ml-1.5 inline-flex h-4 items-center rounded-[3px] border px-1 font-mono text-dense-micro font-bold',
                                    // The design's gate violet is the Strategy
                                    // entity hue it already had: #a78bfa in dark.
                                    r.kind === 'gate'
                                      ? 'border-[var(--color-entity-strategy)]/45 text-[var(--color-entity-strategy)]'
                                      : 'border-lamp-red/45 text-lamp-red',
                                  )}
                                >
                                  {r.kind === 'gate' ? 'GATE HIT' : 'BREACH'}
                                </span>
                              ) : null}
                            </td>
                            <td className={cn(positionsUi.td, 'text-left font-sans')}>
                              <span
                                className={cn(
                                  'inline-flex h-4 items-center rounded-[3px] border px-1.25 font-mono text-dense-micro font-bold tracking-[0.04em]',
                                  r.kind === 'hard'
                                    ? 'border-lamp-red/45 text-lamp-red'
                                    : r.kind === 'gate'
                                      ? 'border-[var(--color-entity-strategy)]/45 text-[var(--color-entity-strategy)]'
                                      : 'border-border text-muted-foreground',
                                )}
                              >
                                {r.kind.toUpperCase()}
                              </span>
                            </td>
                            <td
                              className={cn(
                                positionsUi.td,
                                r.current == null
                                  ? 'text-muted-foreground'
                                  : r.breached
                                    ? 'text-lamp-red'
                                    : 'text-foreground',
                              )}
                            >
                              {fmtReading(r, r.current)}
                            </td>
                            <td
                              className={cn(
                                positionsUi.td,
                                r.limit == null ? 'text-muted-foreground' : 'text-secondary-foreground',
                              )}
                            >
                              {r.limit == null ? 'unwritten' : fmtReading(r, r.limit)}
                            </td>
                            <td className={cn(positionsUi.td, 'text-left')}>
                              {r.use == null || r.headroom == null ? (
                                <span className="inline-flex items-start gap-1.5 whitespace-normal text-dense-meta leading-normal text-muted-foreground">
                                  <StatusLamp
                                    lamp="gray"
                                    variant="dot"
                                    title={r.current == null ? 'No reading' : 'No line'}
                                    className="mt-1 shrink-0"
                                  />
                                  {r.noReading ?? 'no line written'}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-2">
                                  <span className="inline-block h-1.5 w-20 shrink-0 overflow-hidden rounded-sm bg-[var(--sk-surface)]">
                                    <span
                                      className={cn(
                                        'block h-full',
                                        r.breached ? 'bg-lamp-red' : r.use > 0.8 ? 'bg-warning' : 'bg-[var(--sk-line2)]',
                                      )}
                                      style={{ width: `${Math.min(100, Math.round(r.use * 100))}%` }}
                                    />
                                  </span>
                                  <span
                                    className={cn(
                                      positionsUi.mono,
                                      'text-dense-meta',
                                      r.breached ? 'text-lamp-red' : r.use > 0.8 ? 'text-warning' : 'text-muted-foreground',
                                    )}
                                  >
                                    {r.breached ? `over by ${fmtPct0(r.use - 1)}` : `${fmtPct0(r.headroom)} left`}
                                  </span>
                                </span>
                              )}
                            </td>
                            <td
                              className={cn(
                                positionsUi.td,
                                'text-left font-sans whitespace-normal leading-normal text-muted-foreground',
                              )}
                            >
                              {r.onBreach}
                            </td>
                            <td
                              className={cn(
                                positionsUi.td,
                                'text-left font-sans whitespace-normal leading-normal text-muted-foreground',
                              )}
                            >
                              {r.scope}
                              {r.citedFrom ? (
                                <>
                                  {' · '}
                                  <Link to={r.citedFrom.to} className={positionsUi.link}>
                                    {r.citedFrom.label}
                                  </Link>
                                </>
                              ) : null}
                            </td>
                          </tr>
                        )),
                      ]
                    })}
                  </tbody>
                </table>
              </div>
              <p className={cn(FOOT, 'm-0')}>{LIMITS_UNRECORDED.store}</p>
            </section>

            <div className={positionsUi.bandGrid}>
              <section className={positionsUi.panel} aria-label="Escalation">
                <header className={positionsUi.panelHead}>
                  <span className={positionsUi.cap}>Escalation</span>
                  <span className={positionsUi.panelTitle}>what a breach does</span>
                </header>
                {ESCALATION.map((e) => (
                  <div
                    key={e.kind}
                    className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-2.5 border-b border-border/55 px-3 py-2 last:border-b-0"
                  >
                    <span className={cn(positionsUi.mono, 'text-dense-caption font-bold tracking-[0.08em]', e.tone)}>
                      {e.kind}
                    </span>
                    <span className="text-dense-meta leading-normal text-muted-foreground text-pretty">{e.what}</span>
                  </div>
                ))}
                <p className={cn(FOOT, 'm-0')}>{LIMITS_UNRECORDED.rules}</p>
              </section>

              <section className={cn(positionsUi.panel, 'border-warning/40')} aria-label="Recent history">
                <header className={positionsUi.panelHead}>
                  <span className={positionsUi.cap}>Recent history</span>
                  <span className={positionsUi.panelTitle}>when a line was crossed</span>
                  <DenseTag variant="warning" size="cell">
                    ⚠ nothing records it
                  </DenseTag>
                </header>
                <p className="m-0 px-3 py-2.5 text-xs leading-normal text-secondary-foreground text-pretty">
                  The useful question is not whether a line is crossed now — the table above answers that — but how long
                  it stayed crossed and what ended it. That needs a row written every time a reading passes a line.
                </p>
                <p className={cn(FOOT, 'm-0')}>{LIMITS_UNRECORDED.history}</p>
              </section>
            </div>

            <PositionsTier
              label="The daemon’s gate"
              note="not one of the twelve — stored parameters the trading engine would read, edited on Gates"
            />
            <section className={positionsUi.panel} aria-label="The daemon's gate">
              <header className={positionsUi.panelHead}>
                <span className={positionsUi.cap}>The gate</span>
                <span className={positionsUi.panelTitle}>
                  {gateReadings.gateName == null
                    ? 'no allocation is active'
                    : `${gateReadings.gateName} · v${gateReadings.gateVersion}`}
                </span>
                {gateReadings.paperTrade ? (
                  <DenseTag variant="warning" size="cell">
                    ⚠ PAPER TRADE
                  </DenseTag>
                ) : null}
                <Link to="/trade/rules" className={cn(positionsUi.link, 'ml-auto')}>
                  Definition · Trade › Rules →
                </Link>
              </header>
              <p className="m-0 px-3 py-2.5 text-dense-body leading-normal text-secondary-foreground text-pretty">
                {gateReadings.gateName == null ? (
                  'No allocation is active, so no gate applies and the Gate group above is empty.'
                ) : (
                  <>
                    The gate&rsquo;s lines are in the table above, in the Gate group — a gate is a limit whose scope
                    is an allocation ({gateReadings.allocationName}), enforced by the daemon before the action
                    happens rather than noticed after it, so a hit is logged and there is nothing to acknowledge.
                    Its <em>definition</em> lives in Trade › Rules; this page only reads it.
                  </>
                )}
              </p>
              <p className={cn(FOOT, 'm-0')}>
                These are the only limits in this book anybody has written down — and they bound a daemon that is
                frozen (D10)
                {gateReadings.paperTrade ? ' and configured for paper trading' : ''}. Every other group&rsquo;s line
                is missing because the store the design edits them in does not exist yet.
              </p>
            </section>

            <p className="m-0 rounded-md border border-border bg-[var(--sk-raised2)] px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty">
              <span className="font-semibold text-secondary-foreground">Boundary.</span> This page holds readings
              against lines. Each reading is computed on the page named beside it, and the lines belong to a Rules
              engine that does not exist yet — which is why {noLine.length} of the {rows.length} rules have a reading
              and nothing to hold it against.
            </p>
          </>
        )}
      </section>
    </PageShell>
  )
}
