/**
 * Risk · Stress & Scenario — the full surface behind Exposure's summary.
 *
 * Exposure says what a spot move costs the book; this page says which column,
 * and who pays for it. The spot axis and the per-underlying attribution are the
 * model service's own figures, quoted here (§14.2).
 *
 * The design draws a SPY × vol matrix. The service reports
 * `iv_stress_available: false`, so one row of that matrix is real and the rest
 * carry the marker instead of a number — and no named scenario is evaluated,
 * because each of them moves vol as well as spot and lands between the columns
 * the grid actually carries. Interpolating would be a guess wearing a
 * measurement's clothes.
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
import { fmtUsd } from '@/utils/positions'
import { fmtSignedUsd0 } from '@/utils/performanceReading'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { fetchModelAnalysis } from '@/api/portfolio'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import {
  NAMED_SCENARIOS,
  STRESS_UNRECORDED,
  STRESS_VOL_ROWS,
  stressColumns,
  whoPays,
  worstColumn,
} from './stressModel'

const PAGE_LEAD =
  'The full surface behind Exposure’s summary — pick a column to see who pays for it. What each position is worth at that price is Backing & Model’s; this page only attributes the shock.'

const FOOT =
  'border-t border-border bg-[var(--sk-raised2)] px-3 py-1.5 text-dense-meta leading-normal text-muted-foreground text-pretty'

function shockPct(shock: number): string {
  return `${shock > 0 ? '+' : ''}${Math.round(shock * 100)}%`
}

export default function RiskStressPage() {
  const { data: status, isLoading: statusLoading } = useMonitorStatus()
  const [accountFilter, setAccountFilter] = useState('all')
  const [picked, setPicked] = useState<number | null>(null)

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

  const scopeKey = scoped.join(',')
  const modelStamp = modelQueries.map((q) => q.dataUpdatedAt).join(',')

  const columns = useMemo(
    () => stressColumns(modelQueries.map((q) => q.data?.account_stress?.scenarios)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [modelStamp, scopeKey],
  )

  const entries = useMemo(
    () => modelQueries.flatMap((q) => q.data?.per_underlying ?? []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [modelStamp, scopeKey],
  )

  const ivAvailable = useMemo(
    () => modelQueries.some((q) => q.data?.account_stress?.iv_stress_available),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [modelStamp, scopeKey],
  )

  const worst = worstColumn(columns)
  const selectedShock = picked ?? worst?.shock ?? null
  const selected = columns.find((c) => c.shock === selectedShock) ?? null
  const payers = useMemo(
    () => (selectedShock == null ? [] : whoPays(entries, selectedShock)),
    [entries, selectedShock],
  )
  /** Distinct names: one symbol held in two accounts is one name to a reader. */
  const names = useMemo(() => {
    const all = new Set<string>()
    const ok = new Set<string>()
    for (const u of entries) {
      const symbol = (u.symbol ?? '').trim().toUpperCase()
      if (!symbol) continue
      all.add(symbol)
      if (u.stress?.available) ok.add(symbol)
    }
    return { total: all.size, stressable: ok.size }
  }, [entries])
  const maxAbs = Math.max(1, ...columns.map((c) => Math.abs(c.pnlChange)))

  const loading = statusLoading || modelQueries.some((q) => q.isLoading)
  const error = modelQueries.find((q) => q.error)?.error ?? null

  return (
    <PageShell padding="compact" className="space-y-3">
      <section className={positionsUi.pageCard} aria-label="Stress and Scenario">
        <PageHeader
          breadcrumb={<p className="text-xs text-primary/90 font-medium">Risk / Stress &amp; Scenario</p>}
          title="Stress & Scenario"
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
              <Link to="/risk/portfolio" className={positionsUi.link}>
                the summary → Exposure
              </Link>
            </span>
          }
        />

        {error ? <QueryErrorAlert error={error} onRetry={() => modelQueries.forEach((q) => void q.refetch())} /> : null}
        {loading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-28 w-full rounded-md" />
            <Skeleton className="h-64 w-full rounded-md" />
          </div>
        ) : (
          <>
            <PositionsTier
              label="Stress matrix"
              note="what the shock itself costs — not the payoff at that price"
            />
            <section className={cn(positionsUi.panel, !ivAvailable && 'border-warning/40')} aria-label="Stress matrix">
              <header className={positionsUi.panelHead}>
                <span className={positionsUi.panelTitle}>Spot × vol</span>
                {!ivAvailable ? (
                  <DenseTag variant="warning" size="cell">
                    ⚠ no vol axis
                  </DenseTag>
                ) : null}
                {selected ? (
                  <span className={cn(positionsUi.mono, 'text-dense-meta text-muted-foreground')}>
                    SPY {shockPct(selected.shock)} · vol flat selected
                  </span>
                ) : null}
                <span className="ml-auto text-dense-meta text-muted-foreground">
                  {names.stressable} of {names.total} names can be stressed
                </span>
              </header>
              {columns.length === 0 ? (
                <p className="m-0 px-3 py-3 text-dense-meta text-muted-foreground">
                  The model service reports no account stress for this scope.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  {/* §14.6: one label column plus the shocks, the design's 720 floor. */}
                  <table className="w-full min-w-[720px] border-collapse">
                    <thead>
                      <tr>
                        <th className={cn(positionsUi.th, 'text-left')}>vol \ SPY</th>
                        {columns.map((c) => (
                          <th key={c.shock} className={positionsUi.th}>
                            {shockPct(c.shock)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {STRESS_VOL_ROWS.map((row) => (
                        <tr key={row.label}>
                          <td className={cn(positionsUi.td, 'pl-2 text-left font-sans text-muted-foreground')}>
                            {row.label}
                          </td>
                          {columns.map((c) => {
                            if (row.ivShock == null) {
                              return (
                                <td key={c.shock} className={cn(positionsUi.td, 'text-muted-foreground')} title={STRESS_UNRECORDED.volAxis}>
                                  —
                                </td>
                              )
                            }
                            const on = c.shock === selectedShock
                            const a = Math.min(0.32, (Math.abs(c.pnlChange) / maxAbs) * 0.32)
                            return (
                              <td
                                key={c.shock}
                                className={cn(
                                  positionsUi.td,
                                  'cursor-pointer border border-[var(--sk-raised2)]',
                                  on && 'outline outline-1 outline-primary',
                                  pnlColorClass(c.pnlChange),
                                )}
                                style={{
                                  background: `color-mix(in oklab, ${c.pnlChange < 0 ? 'var(--color-loss)' : 'var(--color-profit)'} ${Math.round(a * 100)}%, transparent)`,
                                }}
                                onClick={() => setPicked(c.shock)}
                                title={`SPY ${shockPct(c.shock)} · vol flat · ${c.contributors} contributors${c.partial ? ' · partial' : ''}`}
                              >
                                {fmtSignedUsd0(c.pnlChange)}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className={cn(FOOT, 'm-0')}>
                {STRESS_UNRECORDED.volAxis} The row that reads is the book at today&rsquo;s vol, and it is the same
                figure{' '}
                <Link to="/risk/portfolio" className={positionsUi.link}>
                  Exposure
                </Link>{' '}
                summarises — one computation, cited twice.
              </p>
            </section>

            <div className={positionsUi.bandGrid}>
              <section className={positionsUi.panel} aria-label="Who pays">
                <header className={positionsUi.panelHead}>
                  <span className={positionsUi.cap}>Who pays</span>
                  <span className={positionsUi.panelTitle}>
                    {selectedShock == null ? 'pick a column' : `SPY ${shockPct(selectedShock)}`}
                  </span>
                  {selected ? (
                    <span className={cn(positionsUi.mono, 'text-dense-body font-bold', pnlColorClass(selected.pnlChange))}>
                      {fmtSignedUsd0(selected.pnlChange)}
                    </span>
                  ) : null}
                  <span className="ml-auto text-dense-meta text-muted-foreground">
                    {payers.length} priced at this column
                  </span>
                </header>
                {payers.length === 0 ? (
                  <p className="m-0 px-3 py-3 text-dense-meta text-muted-foreground">
                    No underlying could be stressed at this column.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    {/* §14.6: the design's 560 floor rises to 680 — five columns
                        where the design had two, and the cost column carries a bar,
                        an amount and a share that clipped at 560. */}
                    <table className="w-full min-w-[680px] table-fixed border-collapse">
                      <colgroup>
                        <col style={{ width: '13%' }} />
                        <col style={{ width: '15%' }} />
                        <col style={{ width: '17%' }} />
                        <col style={{ width: '17%' }} />
                        <col style={{ width: '38%' }} />
                      </colgroup>
                      <thead>
                        <tr>
                          <th className={cn(positionsUi.th, 'text-left')}>Symbol</th>
                          <th className={positionsUi.th}>At</th>
                          <th className={positionsUi.th}>Shares</th>
                          <th className={positionsUi.th}>Options</th>
                          <th className={cn(positionsUi.th, 'text-left')}>Cost of the shock</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payers.map((p) => (
                          <tr key={p.symbol} className="hover:[&>td]:bg-[var(--sk-raised2)]">
                            <td className={cn(positionsUi.td, 'pl-2 text-left font-bold text-[var(--color-entity-option)]')}>
                              {p.symbol}
                            </td>
                            <td className={cn(positionsUi.td, 'text-muted-foreground')}>
                              {p.newSpot == null ? '—' : fmtUsd(p.newSpot)}
                            </td>
                            <td className={cn(positionsUi.td, p.stockPnl == null ? 'text-muted-foreground' : pnlColorClass(p.stockPnl))}>
                              {p.stockPnl == null ? '—' : fmtSignedUsd0(p.stockPnl)}
                            </td>
                            <td className={cn(positionsUi.td, p.optionsPnl == null ? 'text-muted-foreground' : pnlColorClass(p.optionsPnl))}>
                              {p.optionsPnl == null ? '—' : fmtSignedUsd0(p.optionsPnl)}
                            </td>
                            <td className={cn(positionsUi.td, 'text-left')}>
                              <span className="inline-flex items-center gap-2">
                                <span className="inline-block h-1.25 w-16 overflow-hidden rounded-sm bg-[var(--sk-surface)]">
                                  <span
                                    className={cn('block h-full', p.pnlChange < 0 ? 'bg-loss/60' : 'bg-profit/60')}
                                    style={{ width: `${Math.round((p.share ?? 0) * 100)}%` }}
                                  />
                                </span>
                                <span className={cn(positionsUi.mono, 'text-xs font-semibold', pnlColorClass(p.pnlChange))}>
                                  {fmtSignedUsd0(p.pnlChange)}
                                </span>
                                {p.share != null ? (
                                  <span className={cn(positionsUi.mono, 'text-dense-meta text-muted-foreground')}>
                                    {Math.round(p.share * 100)}%
                                  </span>
                                ) : null}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <p className={cn(FOOT, 'm-0')}>
                  Share is of what the column costs, so only the names that lose carry one — a name that gains on the
                  shock has no share of the loss. A name the service could not stress is absent here rather than a zero
                  ({names.total - names.stressable} of {names.total} in this scope).
                </p>
              </section>

              <section className={cn(positionsUi.panel, 'border-warning/40')} aria-label="Named scenarios">
                <header className={positionsUi.panelHead}>
                  <span className={positionsUi.cap}>Named scenarios</span>
                  <span className={positionsUi.panelTitle}>what a real day did</span>
                  <DenseTag variant="warning" size="cell">
                    ⚠ none can be read
                  </DenseTag>
                </header>
                {NAMED_SCENARIOS.map((s) => (
                  <div key={s.id} className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 border-b border-border/55 px-3 py-1.75 last:border-b-0">
                    <span className="inline-flex items-center gap-1.5 text-xs leading-normal text-foreground">
                      <StatusLamp lamp="gray" variant="dot" title="No reading — not a fault" />
                      {s.name}
                    </span>
                    <span className={cn(positionsUi.mono, 'text-dense-meta text-muted-foreground')}>{s.shock}</span>
                    <span className="ml-auto text-dense-meta text-muted-foreground">needs {s.blocked}</span>
                  </div>
                ))}
                <p className={cn(FOOT, 'm-0')}>{STRESS_UNRECORDED.named}</p>
              </section>
            </div>

            <section className={positionsUi.panel} aria-label="After the shock">
              <header className={positionsUi.panelHead}>
                <span className={positionsUi.cap}>After the shock</span>
                <span className={positionsUi.panelTitle}>
                  {selectedShock == null ? 'pick a column' : `SPY ${shockPct(selectedShock)} · vol flat`}
                </span>
              </header>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2">
                <span className="text-xs leading-normal text-muted-foreground">Book</span>
                <span className={cn(positionsUi.mono, 'text-dense-body font-bold', pnlColorClass(selected?.pnlChange ?? 0))}>
                  {selected ? fmtSignedUsd0(selected.pnlChange) : '—'}
                </span>
                <span className="ml-4 text-xs leading-normal text-muted-foreground">Backing after shock</span>
                <span className="inline-flex items-center gap-1.5 text-dense-meta text-muted-foreground">
                  <StatusLamp lamp="gray" variant="dot" title="Not computed here" />
                  not computed
                </span>
                <Link to="/portfolio/backing" className={cn(positionsUi.link, 'ml-auto')}>
                  Backing &amp; Model →
                </Link>
              </div>
              <p className={cn(FOOT, 'm-0')}>
                {STRESS_UNRECORDED.backing}
                {selected?.partial
                  ? ' This column is partial: the service priced only part of the book at this shock, and says so.'
                  : ''}
              </p>
            </section>

            <p className="m-0 rounded-md border border-border bg-[var(--sk-raised2)] px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty">
              <span className="font-semibold text-secondary-foreground">Boundary.</span> This page attributes a shock
              across the book. How much of the book is one bet is{' '}
              <Link to="/risk/portfolio" className={positionsUi.link}>
                Exposure&rsquo;s
              </Link>
              ; what a position is worth at that price, and what backs it, is{' '}
              <Link to="/portfolio/backing" className={positionsUi.link}>
                Backing &amp; Model&rsquo;s
              </Link>
              .
            </p>
          </>
        )}
      </section>
    </PageShell>
  )
}
