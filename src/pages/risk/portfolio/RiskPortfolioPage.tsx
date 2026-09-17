/**
 * Risk · Portfolio Exposure — the book as one exposure, not nineteen.
 *
 * Owner ruling 2026-09-17 (option b): this page does what Backing & Model does
 * not — β-weighting, correlation, and the Greeks rolled to the whole book.
 * Per-underlying capital at risk, the payoff model and its own stress stay
 * Backing's subject and are cited here, never redrawn: two pages computing one
 * figure would disagree eventually.
 *
 * β and the correlation matrix are Research's (RS2, computed on read); Δ$ is
 * the model service's; Γ / vega / Θ are the vendor legs the Positions page
 * already rolls up. Nothing here re-derives any of the four.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { PageHeader, PageShell } from '@/components/layout'
import { DenseTag, SegmentControl } from '@/components/data-display'
import { StatusLamp } from '@/components/StatusLamp'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { positionsUi } from '@/components/positions/positionsUi'
import { PositionsTier } from '@/components/positions/PositionsTier'
import { pnlColorClass } from '@/utils/dailyChange'
import { fmtIsoDateToken } from '@/lib/format'
import { fmtUsd } from '@/utils/positions'
import { fmtMvAbbrev } from '@/utils/positionsCharts'
import { fmtSignedUsd0 } from '@/pages/portfolio/performance/performanceReading'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { fetchModelAnalysis } from '@/api/portfolio'
import { fetchRiskBeta, fetchRiskCorrelation } from '@/api/research/riskStats'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { usePositionsBook } from '@/hooks/usePositionsBook'
import { backingPoolUsage, deriveBackingJudgment } from '@/utils/backingJudgment'
import { buildOptionTicker } from '@/utils/optionTicker'
import { extractUnderlyingRootSymbol } from '@/components/positions/linkExecutionModalHelpers'
import {
  RISK_CONCENTRATION_FLOOR,
  RISK_UNRECORDED,
  buildRiskExposureRows,
  effectiveIndependentPositions,
  greeksByUnderlying,
  riskByExpiry,
  type LegGreeks,
  type UnderlyingModelRow,
} from './riskExposureModel'

const PAGE_LEAD =
  'Net book exposure, β-weighted to SPY. What each position is worth and what backs it is Backing & Model’s; this page asks how much of the book is one bet.'

const BETA_WINDOWS = [60, 252] as const
const CORR_WINDOW = 60

const FOOT =
  'border-t border-border bg-[var(--sk-raised2)] px-3 py-1.5 text-dense-meta leading-normal text-muted-foreground text-pretty'

function Stat({
  cap,
  value,
  sub,
  ink,
}: {
  cap: string
  value: string
  sub?: React.ReactNode
  ink?: string
}) {
  return (
    <span className="flex min-w-0 flex-col gap-px">
      <span className={positionsUi.cap}>{cap}</span>
      <span className={cn(positionsUi.mono, 'text-base leading-normal font-bold', ink ?? 'text-foreground')}>
        {value}
      </span>
      {sub ? <span className="text-dense-caption leading-normal text-muted-foreground">{sub}</span> : null}
    </span>
  )
}

/** A correlation cell's ink: amber deepens with ρ, and the diagonal is not a reading. */
function rhoTone(rho: number | null, self: boolean): { text: string; style?: React.CSSProperties } {
  if (self) return { text: 'text-[var(--sk-line2)]' }
  if (rho == null) return { text: 'text-muted-foreground' }
  const a = Math.max(0, rho - 0.2) * 0.42
  return {
    text: rho > 0.7 ? 'text-foreground' : 'text-secondary-foreground',
    style: { background: `color-mix(in oklab, var(--color-warning) ${Math.round(a * 100)}%, transparent)` },
  }
}

export default function RiskPortfolioPage() {
  const { data: status, isLoading: statusLoading } = useMonitorStatus()
  const [accountFilter, setAccountFilter] = useState('all')

  const accountIds = useMemo(
    () => (status?.portfolio?.accounts ?? []).map((a) => (a.account_id ?? '').trim()).filter(Boolean),
    [status],
  )
  const scoped = useMemo(
    () => (accountFilter === 'all' ? accountIds : accountIds.filter((a) => a === accountFilter)),
    [accountIds, accountFilter],
  )

  const modelQueries = useQueries({
    queries: scoped.map((id) => ({
      queryKey: [...QUERY_KEYS.portfolio.modelAnalysis, id],
      queryFn: () => fetchModelAnalysis(id),
      enabled: Boolean(id),
    })),
  })

  /**
   * The model queries rebuild their array every render, so the memos below key
   * on what actually moved: the scope, and the moment each answer last landed.
   */
  const scopeKey = scoped.join(',')
  const modelStamp = modelQueries.map((q) => q.dataUpdatedAt).join(',')

  /**
   * One row per underlying, with the per-account Δ$ summed — the model service's
   * own figures added together, not a second derivation of them.
   */
  const model = useMemo<UnderlyingModelRow[]>(() => {
    const by = new Map<string, UnderlyingModelRow>()
    for (const q of modelQueries) {
      for (const u of q.data?.per_underlying ?? []) {
        const symbol = (u.symbol ?? '').trim().toUpperCase()
        if (!symbol) continue
        const g = u.greeks ?? {}
        const prev = by.get(symbol)
        const dd = g.delta_dollars ?? null
        const ds = g.delta ?? null
        by.set(symbol, {
          symbol,
          spot: u.spot ?? prev?.spot ?? null,
          deltaShares: ds == null && prev?.deltaShares == null ? null : (prev?.deltaShares ?? 0) + (ds ?? 0),
          deltaDollars: dd == null && prev?.deltaDollars == null ? null : (prev?.deltaDollars ?? 0) + (dd ?? 0),
          degraded: Boolean(g.degraded) || Boolean(prev?.degraded),
          reason: g.reason ?? prev?.reason ?? null,
        })
      }
    }
    return [...by.values()]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelStamp, scopeKey])

  const symbols = useMemo(() => model.map((m) => m.symbol).sort(), [model])

  const [betaQuery, corrQuery] = useQueries({
    queries: [
      {
        queryKey: ['research', 'risk', 'beta', symbols.join(','), BETA_WINDOWS.join(',')],
        queryFn: () => fetchRiskBeta(symbols, 'SPY', [...BETA_WINDOWS]),
        enabled: symbols.length > 0,
        staleTime: 60 * 60_000,
      },
      {
        queryKey: ['research', 'risk', 'correlation', symbols.join(','), CORR_WINDOW],
        queryFn: () => fetchRiskCorrelation(symbols, CORR_WINDOW),
        enabled: symbols.length > 1,
        staleTime: 60 * 60_000,
      },
    ],
  })

  const book = usePositionsBook(
    {
      accountFilter:
        accountFilter === 'all'
          ? { host: true, secondary: true }
          : { host: accountFilter === accountIds[0], secondary: accountFilter !== accountIds[0] },
      filterSymbol: '',
      filterExpiry: '',
    },
    0,
  )

  /** The vendor legs, as the Positions page priced them — one rollup, cited twice. */
  const legs = useMemo<LegGreeks[]>(() => {
    const out: LegGreeks[] = []
    for (const g of book.scopedInstanceGroups ?? []) {
      for (const p of g.options ?? []) {
        const underlying = extractUnderlyingRootSymbol(p.symbol)
        const ticker = buildOptionTicker({
          underlying,
          expiry: p.expiry,
          strike: p.strike,
          right: p.right,
        })
        const priced = ticker ? book.greeks.byTicker.get(ticker) : undefined
        if (!priced) continue
        out.push({ underlying, expiry: p.expiry, gamma: priced.gamma, theta: priced.theta, vega: priced.vega })
      }
    }
    return out
  }, [book.scopedInstanceGroups, book.greeks.byTicker])

  const betaBySymbol = useMemo(() => {
    const by = new Map<string, { beta: number | null; n: number }>()
    for (const it of betaQuery.data?.items ?? []) {
      // The shorter window is the one the table shows: it is the book's β now.
      if (it.window !== BETA_WINDOWS[0]) continue
      by.set(it.symbol.trim().toUpperCase(), { beta: it.beta, n: it.n })
    }
    return by
  }, [betaQuery.data?.items])

  const betaLong = useMemo(() => {
    const by = new Map<string, number | null>()
    for (const it of betaQuery.data?.items ?? []) {
      if (it.window !== BETA_WINDOWS[1]) continue
      by.set(it.symbol.trim().toUpperCase(), it.beta)
    }
    return by
  }, [betaQuery.data?.items])

  const { rows, totals } = useMemo(
    () => buildRiskExposureRows({ model, betaBySymbol, greeks: greeksByUnderlying(legs) }),
    [model, betaBySymbol, legs],
  )
  const expiries = useMemo(() => riskByExpiry(legs), [legs])
  const enp = useMemo(
    () => effectiveIndependentPositions(rows, corrQuery.data?.matrix ?? null),
    [rows, corrQuery.data?.matrix],
  )
  const corrSymbols = useMemo(
    () => (corrQuery.data?.symbols ?? []).filter((s) => rows.some((r) => r.symbol === s)),
    [corrQuery.data?.symbols, rows],
  )

  const judgment = useMemo(
    () => (book.alarm ? deriveBackingJudgment(backingPoolUsage(book.alarm.book)) : null),
    [book.alarm],
  )
  const netLiq = useMemo(
    () =>
      (status?.portfolio?.accounts ?? [])
        .filter((a) => accountFilter === 'all' || (a.account_id ?? '').trim() === accountFilter)
        .reduce((s, a) => s + (Number(a.summary?.NetLiquidation) || 0), 0),
    [status, accountFilter],
  )

  /** The account-level stress the model service reports — a spot axis, at today's vol. */
  const stress = useMemo(() => {
    const by = new Map<number, number>()
    let ivAvailable = false
    for (const q of modelQueries) {
      const s = q.data?.account_stress
      if (!s?.available) continue
      if (s.iv_stress_available) ivAvailable = true
      for (const sc of s.scenarios ?? []) {
        if (sc.iv_shock !== 0) continue
        const change = sc.pnl_change
        if (change == null) continue
        by.set(sc.spot_shock, (by.get(sc.spot_shock) ?? 0) + change)
      }
    }
    return {
      ivAvailable,
      cells: [...by.entries()].sort((a, b) => a[0] - b[0]).map(([shock, pnl]) => ({ shock, pnl })),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelStamp, scopeKey])

  const topShare = rows[0]?.share ?? null
  const concentrated = topShare != null && topShare > RISK_CONCENTRATION_FLOOR
  const maxStress = Math.max(1, ...stress.cells.map((c) => Math.abs(c.pnl)))

  const loading = statusLoading || modelQueries.some((q) => q.isLoading)
  const error = modelQueries.find((q) => q.error)?.error ?? null

  return (
    <PageShell padding="compact" className="space-y-3">
      <section className={positionsUi.pageCard} aria-label="Portfolio Exposure">
        <PageHeader
          breadcrumb={<p className="text-xs text-primary/90 font-medium">Risk / Portfolio Exposure</p>}
          title="Portfolio Exposure"
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
              <Link to="/portfolio/positions" className={positionsUi.link}>
                Positions →
              </Link>
            </span>
          }
        />

        {error ? <QueryErrorAlert error={error} onRetry={() => modelQueries.forEach((q) => void q.refetch())} /> : null}
        {loading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-20 w-full rounded-md" />
            <Skeleton className="h-64 w-full rounded-md" />
          </div>
        ) : (
          <>
            <section className={positionsUi.panel} aria-label="Book totals">
              <div className="flex flex-wrap items-start gap-x-7 gap-y-3 px-3.5 py-2.5">
                <Stat cap="Net liq" value={netLiq > 0 ? fmtMvAbbrev(netLiq) : '—'} sub="broker, this scope" />
                <Stat
                  cap="β-wtd Δ$ · SPY-eq"
                  value={totals.withBetaDelta > 0 ? fmtSignedUsd0(totals.betaDeltaDollars) : '—'}
                  ink={pnlColorClass(totals.betaDeltaDollars)}
                  sub={
                    totals.withBetaDelta > 0
                      ? `${fmtSignedUsd0(totals.betaDeltaDollars / 100)} per +1% SPY · ${totals.withBetaDelta} of ${rows.length} names`
                      : 'no name carries both a Δ$ and a β'
                  }
                />
                <Stat
                  cap="Γ · per point"
                  value={legs.length > 0 ? fmtSignedUsd0(totals.gamma) : '—'}
                  ink={totals.gamma < 0 ? 'text-warning' : undefined}
                  sub={totals.gamma < 0 ? 'short gamma — the move works against the book' : 'long gamma'}
                />
                <Stat cap="Vega · per vol pt" value={legs.length > 0 ? fmtSignedUsd0(totals.vega) : '—'} />
                <Stat
                  cap="Θ · per day"
                  value={legs.length > 0 ? fmtSignedUsd0(totals.theta) : '—'}
                  ink={pnlColorClass(totals.theta)}
                />
                <span className="ml-auto">
                  <Stat
                    cap="Backing used"
                    value={judgment?.usedPct != null ? `${Math.round(judgment.usedPct * 100)}%` : '—'}
                    ink={judgment?.overGate ? 'text-warning' : undefined}
                    sub={
                      <>
                        gate 85% ·{' '}
                        <Link to="/portfolio/backing" className={positionsUi.link}>
                          Backing →
                        </Link>
                      </>
                    }
                  />
                </span>
              </div>
              <p className={cn(FOOT, 'm-0')}>
                β and the correlation matrix are Research&rsquo;s, over {CORR_WINDOW}-day daily returns against{' '}
                {betaQuery.data?.benchmark ?? 'SPY'}
                {betaQuery.data?.as_of ? ` · last bar ${fmtIsoDateToken(betaQuery.data.as_of)}` : ''}. Δ$ is the model
                service&rsquo;s; Γ, vega and Θ are the vendor legs Positions prices. This page re-derives none of the
                four — what a position is worth and what backs it is{' '}
                <Link to="/portfolio/backing" className={positionsUi.link}>
                  Backing &amp; Model&rsquo;s
                </Link>
                .
              </p>
            </section>

            <PositionsTier
              label="Net Greeks by underlying"
              note="β-wtd Δ$ = Δ$ × β against SPY · share is of the book’s risk, so a short name is a slice too"
            />
            <section className={positionsUi.panel} aria-label="Net Greeks by underlying">
              <header className={positionsUi.panelHead}>
                <span className={positionsUi.panelTitle}>{rows.length} names</span>
                {totals.withoutBetaDelta > 0 ? (
                  <span className="inline-flex items-center gap-1.5 text-dense-meta text-muted-foreground">
                    <StatusLamp lamp="gray" variant="dot" title="No reading — not a fault" />
                    {totals.withoutBetaDelta} without a β-weighted Δ$
                  </span>
                ) : null}
                {concentrated ? (
                  <span className="ml-auto text-dense-meta font-semibold text-warning">
                    concentration · {rows[0].symbol} {Math.round((topShare ?? 0) * 100)}% of β-Δ (over{' '}
                    {Math.round(RISK_CONCENTRATION_FLOOR * 100)}%)
                  </span>
                ) : null}
              </header>
              <div className="overflow-x-auto">
                {/* §14.6: eleven columns, the design's 1060 floor. */}
                <table className="w-full min-w-[1060px] table-fixed border-collapse">
                  <colgroup>
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '9%' }} />
                    <col style={{ width: '11%' }} />
                    <col style={{ width: '11%' }} />
                    <col style={{ width: '14%' }} />
                    <col style={{ width: '9%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '6%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className={cn(positionsUi.th, 'text-left')}>Sym</th>
                      <th className={positionsUi.th} title={`${BETA_WINDOWS[0]}-day against SPY`}>
                        β · {BETA_WINDOWS[0]}d
                      </th>
                      <th className={positionsUi.th} title={`${BETA_WINDOWS[1]}-day against SPY`}>
                        β · {BETA_WINDOWS[1]}d
                      </th>
                      <th className={positionsUi.th}>Spot</th>
                      <th className={positionsUi.th}>Δ$</th>
                      <th className={positionsUi.th}>β-wtd Δ$</th>
                      <th className={cn(positionsUi.th, 'text-left')}>share of β-Δ</th>
                      <th className={positionsUi.th}>Γ /pt</th>
                      <th className={positionsUi.th}>Vega /pt</th>
                      <th className={positionsUi.th}>Θ /d</th>
                      <th className={positionsUi.th}>Legs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const hot = (r.share ?? 0) > RISK_CONCENTRATION_FLOOR
                      return (
                        <tr key={r.symbol} className="hover:[&>td]:bg-[var(--sk-raised2)]">
                          <td className={cn(positionsUi.td, 'pl-2 text-left font-bold text-[var(--color-entity-option)]')}>
                            {r.symbol}
                          </td>
                          <td className={cn(positionsUi.td, r.beta == null ? 'text-muted-foreground' : 'text-secondary-foreground')}>
                            {r.beta == null ? '—' : r.beta.toFixed(2)}
                          </td>
                          <td className={cn(positionsUi.td, 'text-muted-foreground')}>
                            {betaLong.get(r.symbol) == null ? '—' : betaLong.get(r.symbol)!.toFixed(2)}
                          </td>
                          <td className={cn(positionsUi.td, 'text-muted-foreground')}>
                            {r.spot == null ? '—' : fmtUsd(r.spot)}
                          </td>
                          <td className={cn(positionsUi.td, r.deltaDollars == null ? 'text-muted-foreground' : 'text-foreground')}>
                            {r.deltaDollars == null ? '—' : fmtSignedUsd0(r.deltaDollars)}
                          </td>
                          <td
                            className={cn(
                              positionsUi.td,
                              'font-bold',
                              r.betaDeltaDollars == null ? 'text-muted-foreground' : 'text-foreground',
                            )}
                          >
                            {r.betaDeltaDollars == null ? '—' : fmtSignedUsd0(r.betaDeltaDollars)}
                          </td>
                          <td className={cn(positionsUi.td, 'text-left')}>
                            {r.share == null ? (
                              <span className="inline-flex items-center gap-1.5 text-dense-meta text-muted-foreground">
                                <StatusLamp lamp="gray" variant="dot" title="No reading" />
                                {r.noReadingReason === 'no_spot' ? 'no spot' : 'no reading'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-2">
                                <span className="inline-block h-1.25 w-18 overflow-hidden rounded-sm bg-[var(--sk-surface)]">
                                  <span
                                    className={cn('block h-full', hot ? 'bg-warning' : 'bg-[var(--sk-line2)]')}
                                    style={{ width: `${Math.round(r.share * 100)}%` }}
                                  />
                                </span>
                                <span className={cn(positionsUi.mono, 'text-dense-meta', hot ? 'text-warning' : 'text-muted-foreground')}>
                                  {Math.round(r.share * 100)}%
                                </span>
                              </span>
                            )}
                          </td>
                          <td className={cn(positionsUi.td, r.gamma == null ? 'text-muted-foreground' : r.gamma < 0 ? 'text-warning' : 'text-secondary-foreground')}>
                            {r.gamma == null ? '—' : fmtSignedUsd0(r.gamma)}
                          </td>
                          <td className={cn(positionsUi.td, r.vega == null ? 'text-muted-foreground' : 'text-secondary-foreground')}>
                            {r.vega == null ? '—' : fmtSignedUsd0(r.vega)}
                          </td>
                          <td className={cn(positionsUi.td, r.theta == null ? 'text-muted-foreground' : pnlColorClass(r.theta))}>
                            {r.theta == null ? '—' : fmtSignedUsd0(r.theta)}
                          </td>
                          <td className={cn(positionsUi.td, r.legs === 0 ? 'text-muted-foreground' : 'text-secondary-foreground')}>
                            {r.legs === 0 ? 'stock' : r.legs}
                          </td>
                        </tr>
                      )
                    })}
                    <tr>
                      <td className={cn(positionsUi.td, 'border-b-0 pl-2 text-left font-sans font-semibold text-muted-foreground')}>
                        Net
                      </td>
                      <td className={cn(positionsUi.td, 'border-b-0')} colSpan={3} />
                      <td className={cn(positionsUi.td, 'border-b-0 font-bold text-foreground')}>
                        {fmtSignedUsd0(totals.deltaDollars)}
                      </td>
                      <td className={cn(positionsUi.td, 'border-b-0 font-bold text-foreground')}>
                        {fmtSignedUsd0(totals.betaDeltaDollars)}
                      </td>
                      <td className={cn(positionsUi.td, 'border-b-0')} />
                      <td className={cn(positionsUi.td, 'border-b-0 font-bold', totals.gamma < 0 ? 'text-warning' : 'text-foreground')}>
                        {fmtSignedUsd0(totals.gamma)}
                      </td>
                      <td className={cn(positionsUi.td, 'border-b-0 font-bold text-foreground')}>
                        {fmtSignedUsd0(totals.vega)}
                      </td>
                      <td className={cn(positionsUi.td, 'border-b-0 font-bold', pnlColorClass(totals.theta))}>
                        {fmtSignedUsd0(totals.theta)}
                      </td>
                      <td className={cn(positionsUi.td, 'border-b-0 text-secondary-foreground')}>{legs.length}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className={cn(FOOT, 'm-0')}>
                A name the vendor could not price is counted and left out of the sums — never added as a zero. β is
                Research&rsquo;s reading over {BETA_WINDOWS[0]} and {BETA_WINDOWS[1]} sessions; a window it could not
                fill comes back as no reading, not as 1.0.
              </p>
            </section>

            <div className={positionsUi.bandGrid}>
              <section className={positionsUi.panel} aria-label="One bet or five">
                <header className={positionsUi.panelHead}>
                  <span className={positionsUi.cap}>One bet or many</span>
                  <span className={positionsUi.panelTitle}>correlation · {CORR_WINDOW}d daily returns</span>
                  <span className="ml-auto text-dense-meta text-muted-foreground">
                    effective independent positions{' '}
                    <span
                      className={cn(
                        positionsUi.mono,
                        'font-bold',
                        enp.n != null && enp.n < enp.counted * 0.6 ? 'text-warning' : 'text-foreground',
                      )}
                    >
                      {enp.n == null ? '—' : enp.n.toFixed(1)}
                    </span>{' '}
                    of {enp.counted}
                  </span>
                </header>
                {corrSymbols.length > 1 ? (
                  <div className="overflow-x-auto px-3 py-2.5">
                    <table className="border-collapse">
                      <thead>
                        <tr>
                          <th className={cn(positionsUi.th, 'border-b-0 text-left')} />
                          {corrSymbols.map((s) => (
                            <th key={s} className={cn(positionsUi.th, 'border-b-0 px-1.5 text-center')}>
                              {s}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {corrSymbols.map((a) => (
                          <tr key={a}>
                            <td className={cn(positionsUi.td, 'border-b-0 pr-2 text-left font-bold text-[var(--color-entity-option)]')}>
                              {a}
                            </td>
                            {corrSymbols.map((b) => {
                              const cell = corrQuery.data?.matrix?.[a]?.[b]
                              const self = a === b
                              const tone = rhoTone(cell?.rho ?? null, self)
                              return (
                                <td
                                  key={b}
                                  className={cn(positionsUi.td, 'border border-[var(--sk-raised2)] px-1.5 text-center', tone.text)}
                                  style={tone.style}
                                  title={`${a} / ${b} · ${CORR_WINDOW}d${cell?.n ? ` · n ${cell.n}` : ''}`}
                                >
                                  {self ? '—' : cell?.rho == null ? '·' : cell.rho.toFixed(2)}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="m-0 px-3 py-3 text-dense-meta text-muted-foreground">
                    A matrix needs two names Research can fill; this scope has {corrSymbols.length}.
                  </p>
                )}
                <p className={cn(FOOT, 'm-0')}>
                  β-weighting says the book is spread over {totals.withBetaDelta} names;{' '}
                  {enp.n == null
                    ? 'correlation has no reading for this scope'
                    : `correlation says it is ${enp.n.toFixed(1)} ${enp.n < 2 ? 'bet' : 'bets'}`}
                  . A genuine diversifier is short-beta or long-vol, not another name.{' '}
                  {enp.unfilled > 0
                    ? `${enp.unfilled} pairs the matrix could not fill are left out rather than read as uncorrelated.`
                    : ''}{' '}
                  {RISK_UNRECORDED.cluster}
                </p>
              </section>

              <section className={cn(positionsUi.panel, !stress.ivAvailable && 'border-warning/40')} aria-label="Stress">
                <header className={positionsUi.panelHead}>
                  <span className={positionsUi.cap}>Stress</span>
                  <span className={positionsUi.panelTitle}>P&amp;L against a spot move</span>
                  {!stress.ivAvailable ? (
                    <DenseTag variant="warning" size="cell">
                      ⚠ no vol axis
                    </DenseTag>
                  ) : null}
                  <span className="ml-auto text-dense-meta text-muted-foreground">whole book · cited from the model</span>
                </header>
                {stress.cells.length === 0 ? (
                  <p className="m-0 px-3 py-3 text-dense-meta text-muted-foreground">
                    The model service reports no account stress for this scope.
                  </p>
                ) : (
                  stress.cells.map((c) => (
                    <div key={c.shock} className="flex flex-wrap items-center gap-2.5 border-b border-border/55 px-3 py-1.5 last:border-b-0">
                      <span className={cn(positionsUi.mono, 'w-16 text-xs text-secondary-foreground')}>
                        {c.shock > 0 ? '+' : ''}
                        {Math.round(c.shock * 100)}%
                      </span>
                      <span className="relative h-1.75 min-w-15 flex-[1_1_8rem] overflow-hidden rounded-sm bg-[var(--sk-surface)]">
                        <span
                          className={cn('absolute inset-y-0', c.pnl < 0 ? 'right-1/2 bg-loss/60' : 'left-1/2 bg-profit/60')}
                          style={{ width: `${Math.round((Math.abs(c.pnl) / maxStress) * 50)}%` }}
                        />
                        <span className="absolute inset-y-0 left-1/2 w-px bg-[var(--sk-line2)]" />
                      </span>
                      <span className={cn(positionsUi.mono, 'w-24 text-right text-xs font-semibold', pnlColorClass(c.pnl))}>
                        {fmtSignedUsd0(c.pnl)}
                      </span>
                    </div>
                  ))
                )}
                <p className={cn(FOOT, 'm-0')}>
                  Each row is what the shock itself costs, not the payoff at that price. {RISK_UNRECORDED.volShock} Where
                  usage would cross the gate is not interpolated here —{' '}
                  <Link to="/portfolio/backing" className={positionsUi.link}>
                    Backing &amp; Model →
                  </Link>{' '}
                  {RISK_UNRECORDED.gateHit}
                </p>
              </section>
            </div>

            <section className={positionsUi.panel} aria-label="By expiry">
              <header className={positionsUi.panelHead}>
                <span className={positionsUi.cap}>By expiry</span>
                <span className={positionsUi.panelTitle}>where Γ and Θ sit</span>
                <span className="ml-auto text-dense-meta text-muted-foreground">
                  {legs.length} priced {legs.length === 1 ? 'leg' : 'legs'}
                  {book.greeks.unmatched > 0 ? ` · ${book.greeks.unmatched} the vendor could not price` : ''}
                </span>
              </header>
              {expiries.length === 0 ? (
                <p className="m-0 px-3 py-3 text-dense-meta text-muted-foreground">No option legs in this scope.</p>
              ) : (
                <div className="overflow-x-auto">
                  {/* §14.6: five columns, the design's 620 floor. */}
                  <table className="w-full min-w-[620px] table-fixed border-collapse">
                    <colgroup>
                      <col style={{ width: '18%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '20%' }} />
                      <col style={{ width: '20%' }} />
                      <col style={{ width: '30%' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th className={cn(positionsUi.th, 'text-left')}>Expiry</th>
                        <th className={positionsUi.th}>Legs</th>
                        <th className={positionsUi.th}>Γ /pt</th>
                        <th className={positionsUi.th}>Θ /d</th>
                        <th className={positionsUi.th}>Vega /pt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expiries.map((e) => (
                        <tr key={e.expiry}>
                          <td className={cn(positionsUi.td, 'pl-2 text-left font-bold text-[var(--color-entity-option)]')}>
                            {fmtIsoDateToken(`${e.expiry.slice(0, 4)}-${e.expiry.slice(4, 6)}-${e.expiry.slice(6, 8)}`)}
                          </td>
                          <td className={cn(positionsUi.td, 'text-secondary-foreground')}>{e.legs}</td>
                          <td className={cn(positionsUi.td, (e.gamma ?? 0) < 0 ? 'text-warning' : 'text-secondary-foreground')}>
                            {e.gamma == null ? '—' : fmtSignedUsd0(e.gamma)}
                          </td>
                          <td className={cn(positionsUi.td, pnlColorClass(e.theta ?? 0))}>
                            {e.theta == null ? '—' : fmtSignedUsd0(e.theta)}
                          </td>
                          <td className={cn(positionsUi.td, 'text-secondary-foreground')}>
                            {e.vega == null ? '—' : fmtSignedUsd0(e.vega)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className={cn(FOOT, 'm-0')}>
                Which expiry carries an event, and which strike the dealers sit at, is Events&rsquo; subject — this table
                only says where the book&rsquo;s convexity and carry are.
              </p>
            </section>

            <p className="m-0 rounded-md border border-border bg-[var(--sk-raised2)] px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty">
              <span className="font-semibold text-secondary-foreground">Boundary.</span> This page asks how much of the
              book is one bet. What a position is worth, what backs it, and its own payoff and stress are{' '}
              <Link to="/portfolio/backing" className={positionsUi.link}>
                Backing &amp; Model&rsquo;s
              </Link>{' '}
              — computed once, cited here.
            </p>
          </>
        )}
      </section>
    </PageShell>
  )
}
