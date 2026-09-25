/**
 * Risk · Margin & Buying Power — who is using it, and what closing something
 * buys back.
 *
 * The broker's own figures, rolled up by the util the Positions cockpit already
 * uses (§14.2): net liquidation, maintenance, excess liquidity, the Cushion it
 * reports itself. Backing used is Backing & Model's judgment, cited.
 *
 * The one thing the broker never reports is margin per position. The design's
 * per-name maintenance column has no source, so this page shows what the model
 * service does report — the capital each name has committed — and says plainly
 * that the two are different quantities.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { Button, ViewState } from '@bifrost/ui'
import { PageHead, PageShell } from '@/components/layout'
import { DenseTag, SegmentControl } from '@/components/data-display'
import { StatusLamp } from '@/components/StatusLamp'
import { positionsUi } from '@/components/positions/positionsUi'
import { PositionsTier } from '@/components/positions/PositionsTier'
import { PositionsStat } from '@/components/positions/PositionsStat'
import { BackingHeadroomPanel } from '@/components/positions/BackingHeadroomPanel'
import { fmtMvAbbrev } from '@/utils/positionsCharts'
import { fmtPct0 } from '@/utils/positions'
import { pnlColorClass } from '@/utils/dailyChange'
import { fmtSignedUsd0 } from '@/utils/performanceReading'
import { rollupMargin } from '@/utils/marginPressure'
import { backingPoolUsage, deriveBackingJudgment } from '@/utils/backingJudgment'
import { fetchModelAnalysis } from '@/api/portfolio'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { usePositionsBook } from '@/hooks/usePositionsBook'
import { usePreviewState } from '@/hooks/usePreviewState'
import { failedDetail, sourceState, staleDetail } from '@/lib/viewState'
import { MARGIN_UNRECORDED, marginUsers, marginUsersTotal } from './marginModel'

const PAGE_LEAD =
  'Who is using the margin, what a shock does to it, and what closing something buys back. The broker reports margin per account and never per position — the page says which figures are its and which are the model’s.'

const FOOT =
  'border-t border-border bg-[var(--sk-raised2)] px-3 py-1.5 text-dense-meta leading-normal text-muted-foreground text-pretty'

/** Past this pressure, the broker is closer to closing positions than the house gate is. */
const PRESSURE_WARN = 0.5

export default function RiskMarginPage() {
  const statusQ = useMonitorStatus()
  const status = statusQ.data
  const preview = usePreviewState()
  const [accountFilter, setAccountFilter] = useState('all')

  const accounts = useMemo(() => status?.portfolio?.accounts ?? [], [status])
  const accountIds = useMemo(
    () => accounts.map((a) => (a.account_id ?? '').trim()).filter(Boolean),
    [accounts],
  )
  const scopedAccounts = useMemo(
    () => accounts.filter((a) => accountFilter === 'all' || (a.account_id ?? '').trim() === accountFilter),
    [accounts, accountFilter],
  )
  const scopedIds = useMemo(
    () => (accountFilter === 'all' ? accountIds : accountIds.filter((a) => a === accountFilter)),
    [accountIds, accountFilter],
  )

  /** The broker's own figures, through the one rollup the cockpit uses. */
  const margin = useMemo(() => rollupMargin(scopedAccounts), [scopedAccounts])

  const modelQueries = useQueries({
    queries: scopedIds.map((id) => ({
      queryKey: ['portfolio', 'model-analysis', id],
      queryFn: () => fetchModelAnalysis(id),
      enabled: Boolean(id),
    })),
  })
  const modelStamp = modelQueries.map((q) => q.dataUpdatedAt).join(',')
  const scopeKey = scopedIds.join(',')
  const users = useMemo(
    () => marginUsers(modelQueries.flatMap((q) => q.data?.per_underlying ?? [])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [modelStamp, scopeKey],
  )
  const usersTotal = marginUsersTotal(users)

  /**
   * What a shock does to the two halves of the ratio.
   *
   * Net liq after the shock is a reading: the model service says what the shock
   * costs the book, and that comes straight off net liquidation. The
   * requirement is not — the broker would have to re-run its own margin at the
   * shocked price, and nothing asks it to. So pressure after a shock has no
   * reading either, and the panel says which half is missing rather than
   * implying both are known.
   */
  const shocked = useMemo(() => {
    const by = new Map<number, number>()
    for (const q of modelQueries) {
      for (const sc of q.data?.account_stress?.scenarios ?? []) {
        if (sc.iv_shock !== 0 || sc.pnl_change == null) continue
        by.set(sc.spot_shock, (by.get(sc.spot_shock) ?? 0) + sc.pnl_change)
      }
    }
    return [-0.1, -0.05]
      .filter((k) => by.has(k))
      .map((k) => ({ shock: k, pnl: by.get(k) ?? 0, netLiqAfter: margin.netLiquidation + (by.get(k) ?? 0) }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelStamp, scopeKey, margin.netLiquidation])

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
  const judgment = useMemo(
    () => (book.alarm ? deriveBackingJudgment(backingPoolUsage(book.alarm.book)) : null),
    [book.alarm],
  )

  // §17.1: the broker's account summary (the monitor's status read) is the
  // page's one critical source; the model's stress read failing is narrower.
  const pageState = preview === 'loading' || preview === 'failed' || preview === 'stale' ? preview : sourceState(statusQ)
  const retry = () => void statusQ.refetch()
  const error = modelQueries.find((q) => q.error)?.error ?? null
  const maxCommitted = Math.max(1, ...users.map((u) => u.committed))
  const buyingPower = margin.accounts.reduce((a, f) => a + (f.buyingPower ?? 0), 0)

  return (
    <PageShell padding="compact" className="space-y-3">
      <section className={positionsUi.pageCard} aria-label="Margin and Buying Power">
        {/* §16.10 with §17 (one pass per page): the lead behind ⓘ, the way to
            the backing model a head action, the account switch in the toolbar. */}
        <PageHead
          title="Margin & Buying Power"
          info={PAGE_LEAD}
          actions={
            <Button asChild variant="outline" size="sm">
              <Link to="/portfolio/backing" title="What backs it — Backing & Model">
                Backing model →
              </Link>
            </Button>
          }
        />
        {accountIds.length > 1 ? (
          <div data-sr-toolbar="">
            <span data-sr-tb="label">Account</span>
            <SegmentControl
              size="xs"
              ariaLabel="Account"
              value={accountFilter}
              onChange={setAccountFilter}
              options={[{ value: 'all', label: 'All' }, ...accountIds.map((a) => ({ value: a, label: a }))]}
            />
          </div>
        ) : null}

        {pageState === 'stale' ? (
          <ViewState
            kind="stale"
            title="Couldn’t refresh margin"
            detail={staleDetail(statusQ, 'requirements since then are not reflected.')}
            onAction={retry}
          />
        ) : null}
        {pageState !== 'loading' && pageState !== 'failed' && error != null ? (
          <ViewState
            kind="failed"
            layout="strip"
            title="Couldn’t load the stress model"
            detail={failedDetail(
              { data: null, isPending: false, isError: true, error },
              'Under stress reads nothing — unmeasured, not unaffected.',
            )}
            onAction={() => modelQueries.forEach((q) => void q.refetch())}
          />
        ) : null}
        {pageState === 'loading' ? (
          <section className={positionsUi.panel}>
            <ViewState kind="loading" title="Loading margin" rows={8} cols={6} />
          </section>
        ) : pageState === 'failed' ? (
          <section className={positionsUi.panel}>
            <ViewState
              kind="failed"
              title="Couldn’t load margin"
              detail={failedDetail(
                statusQ,
                'Margin was not read — no requirement shown does not mean none is due.',
              )}
              onAction={retry}
            />
          </section>
        ) : (
          <>
            <section className={positionsUi.panel} aria-label="What the broker says">
              {/* §17.4: a reading strip inside the panel — the panel is the frame. */}
              <div data-sr-kpi="strip-inset">
                <PositionsStat
                  cap="Net liq"
                  value={margin.netLiquidation > 0 ? fmtMvAbbrev(margin.netLiquidation) : '—'}
                  sub={`${margin.accounts.length} funded ${margin.accounts.length === 1 ? 'account' : 'accounts'}`}
                />
                <PositionsStat
                  cap="Maintenance"
                  value={margin.maintMarginReq > 0 ? fmtMvAbbrev(margin.maintMarginReq) : '—'}
                  sub={
                    margin.netLiquidation > 0
                      ? `${fmtPct0(margin.maintMarginReq / margin.netLiquidation)} of net liq`
                      : 'the broker’s own requirement'
                  }
                />
                <PositionsStat
                  cap="Pressure · 1 − Cushion"
                  value={fmtPct0(margin.pressure)}
                  ink={(margin.pressure ?? 0) > PRESSURE_WARN ? 'text-warning' : undefined}
                  sub={
                    margin.excessLiquidity > 0
                      ? `${fmtMvAbbrev(margin.excessLiquidity)} excess left${margin.tightest ? ` · tightest ${margin.tightest.accountId}` : ''}`
                      : 'the broker’s Cushion, inverted'
                  }
                />
                <PositionsStat
                  cap="Backing used"
                  value={judgment?.usedPct != null ? fmtPct0(judgment.usedPct) : '—'}
                  ink={judgment?.overGate ? 'text-warning' : undefined}
                  sub={
                    <>
                      of the pool ·{' '}
                      <Link to="/portfolio/backing" className={positionsUi.link}>
                        Backing →
                      </Link>
                    </>
                  }
                />
                <PositionsStat
                  cap="Headroom to gate"
                  value={judgment && judgment.spendable > 0 ? fmtMvAbbrev(judgment.spendable) : '—'}
                  ink="text-primary"
                  sub="under the 85% house line"
                />
                <PositionsStat
                  cap="Options buying power"
                  value={buyingPower > 0 ? fmtMvAbbrev(buyingPower) : '—'}
                  sub="the broker’s own figure, summed over the scope"
                />
              </div>
              <p className={cn(FOOT, 'm-0')}>
                Two different lines, and neither is the other. Pressure is the broker&rsquo;s — at 1 it has no excess
                liquidity left and starts closing positions. The 85% gate is the house&rsquo;s, on pool usage, and{' '}
                <Link to="/portfolio/backing" className={positionsUi.link}>
                  Backing &amp; Model
                </Link>{' '}
                computes it.
              </p>
            </section>

            <PositionsTier label="By account" note="the broker reports each one separately — a blend would hide the tight one" />
            <section className={positionsUi.panel} aria-label="By account">
              <div className="overflow-x-auto">
                {/* §14.6: seven columns, the design's 860 floor. */}
                <table data-sr-table="" className="min-w-[860px]">
                  <colgroup>
                    <col style={{ width: '16%' }} />
                    <col style={{ width: '14%' }} />
                    <col style={{ width: '14%' }} />
                    <col style={{ width: '14%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '14%' }} />
                    <col style={{ width: '16%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th data-sr-col="entity">Account</th>
                      <th data-sr-col="num">Net liq</th>
                      <th data-sr-col="num">Maintenance</th>
                      <th data-sr-col="num">Excess</th>
                      <th data-sr-col="num">Pressure</th>
                      <th data-sr-col="num">Buying power</th>
                      <th data-sr-col="tag">Reading</th>
                    </tr>
                  </thead>
                  <tbody>
                    {margin.accounts.map((a) => {
                      const hot = (a.pressure ?? 0) > PRESSURE_WARN
                      return (
                        <tr key={a.accountId} className="hover:[&>td]:bg-[var(--sk-raised2)]">
                          <td data-sr-col="entity" className="font-mono font-bold text-secondary-foreground">
                            {a.accountId}
                          </td>
                          <td data-sr-col="num" className="text-foreground">
                            {a.netLiquidation == null ? '—' : fmtMvAbbrev(a.netLiquidation)}
                          </td>
                          <td data-sr-col="num" className="text-secondary-foreground">
                            {a.maintMarginReq == null ? '—' : fmtMvAbbrev(a.maintMarginReq)}
                          </td>
                          <td data-sr-col="num" className="text-secondary-foreground">
                            {a.excessLiquidity == null ? '—' : fmtMvAbbrev(a.excessLiquidity)}
                          </td>
                          <td data-sr-col="num" className={hot ? 'text-warning' : 'text-secondary-foreground'}>
                            {fmtPct0(a.pressure)}
                          </td>
                          <td data-sr-col="num" className="text-muted-foreground">
                            {a.buyingPower == null ? '—' : fmtMvAbbrev(a.buyingPower)}
                          </td>
                          <td data-sr-col="tag">
                            <span className="inline-flex items-center gap-1.5 text-dense-meta text-muted-foreground">
                              <StatusLamp lamp={hot ? 'yellow' : 'green'} variant="dot" title={hot ? 'Tight' : 'Room'} />
                              {a.netLiquidation ? (hot ? 'tight' : 'room') : 'not funded'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p className={cn(FOOT, 'm-0')}>
                Every figure here is the broker&rsquo;s own field, not a derivation — Cushion included, which is why
                Pressure is 1 − Cushion rather than a ratio this page builds.
              </p>
            </section>

            <PositionsTier label="Margin users" note="what each name ties up — committed capital, not maintenance margin" />
            <section className={cn(positionsUi.panel, 'border-warning/40')} aria-label="Margin users">
              <header className={positionsUi.panelHead}>
                <span className={positionsUi.panelTitle}>
                  {users.length} {users.length === 1 ? 'name' : 'names'} · {fmtMvAbbrev(usersTotal.committed)} committed
                </span>
                <DenseTag variant="warning" size="cell">
                  ⚠ not maintenance margin
                </DenseTag>
                {usersTotal.unbounded > 0 ? (
                  <span className="inline-flex items-center gap-1.5 text-dense-meta text-warning">
                    <StatusLamp lamp="yellow" variant="dot" title="Loss could not be bounded" />
                    {usersTotal.unbounded} unbounded
                  </span>
                ) : null}
                <Link to="/portfolio/positions" className={cn(positionsUi.link, 'ml-auto')}>
                  the lines → Positions
                </Link>
              </header>
              {users.length === 0 ? (
                <p className="m-0 px-3 py-3 text-dense-meta text-muted-foreground">
                  No name in this scope ties up capital the model service can measure.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  {/* §14.6: five columns, the design's 700 floor. */}
                  <table data-sr-table="" className="min-w-[700px]">
                    <colgroup>
                      <col style={{ width: '14%' }} />
                      <col style={{ width: '18%' }} />
                      <col style={{ width: '18%' }} />
                      <col style={{ width: '16%' }} />
                      <col style={{ width: '34%' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th data-sr-col="entity">Symbol</th>
                        <th data-sr-col="num">Committed</th>
                        <th data-sr-col="num">At risk</th>
                        <th data-sr-col="tag">Risk</th>
                        <th>Share of committed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.symbol} className="hover:[&>td]:bg-[var(--sk-raised2)]">
                          <td data-sr-col="entity" className="font-mono font-bold text-[var(--color-entity-option)]">
                            {u.symbol}
                          </td>
                          <td data-sr-col="num" className="font-bold text-foreground">{fmtMvAbbrev(u.committed)}</td>
                          <td data-sr-col="num" className={u.atRisk == null ? 'text-warning' : 'text-secondary-foreground'}>
                            {u.atRisk == null ? 'unbounded' : fmtMvAbbrev(u.atRisk)}
                          </td>
                          <td data-sr-col="tag" className="text-muted-foreground">
                            {u.riskType || '—'}
                          </td>
                          <td>
                            <span className="inline-flex items-center gap-2">
                              <span className="inline-block h-1.25 w-24 overflow-hidden rounded-sm bg-[var(--sk-surface)]">
                                <span
                                  className="block h-full bg-[var(--sk-line2)]"
                                  style={{ width: `${Math.round((u.committed / maxCommitted) * 100)}%` }}
                                />
                              </span>
                              <span className={cn(positionsUi.mono, 'text-dense-meta text-muted-foreground')}>
                                {fmtPct0(u.share)}
                              </span>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className={cn(FOOT, 'm-0')}>{MARGIN_UNRECORDED.perPosition}</p>
            </section>

            <div className={positionsUi.bandGrid}>
              <BackingHeadroomPanel
                usedPct={judgment?.usedPct ?? null}
                action={
                  <Link to="/risk/portfolio" className={positionsUi.link}>
                    the same rulers &rarr; Exposure
                  </Link>
                }
                foot={
                  <>
                    The same three rulers Risk &rsaquo; Exposure draws, from the same judgment &mdash; one computation,
                    cited twice. The red line is the house gate; the broker&rsquo;s own line is Pressure above, and at 1
                    it is the broker, not the house, that acts.
                  </>
                }
              />

              <section className={positionsUi.panel} aria-label="Under stress">
                <header className={positionsUi.panelHead}>
                  <span className={positionsUi.cap}>Under stress</span>
                  <span className={positionsUi.panelTitle}>net liq after the shock</span>
                  <Link to="/risk/stress" className={cn(positionsUi.link, 'ml-auto')}>
                    who pays &rarr; Stress &amp; Scenario
                  </Link>
                </header>
                {shocked.length === 0 ? (
                  <p className="m-0 px-3 py-3 text-dense-meta text-muted-foreground">
                    The model service reports no account stress for this scope.
                  </p>
                ) : (
                  shocked.map((r) => (
                    <div
                      key={r.shock}
                      className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border/55 px-3 py-1.75 last:border-b-0"
                    >
                      <span className={cn(positionsUi.mono, 'w-16 text-xs text-secondary-foreground')}>
                        SPY {Math.round(r.shock * 100)}%
                      </span>
                      <span className={cn(positionsUi.mono, 'text-xs font-semibold', pnlColorClass(r.pnl))}>
                        {fmtSignedUsd0(r.pnl)}
                      </span>
                      <span className="text-dense-meta text-muted-foreground">net liq becomes</span>
                      <span className={cn(positionsUi.mono, 'text-xs font-bold text-foreground')}>
                        {fmtMvAbbrev(r.netLiqAfter)}
                      </span>
                      <span className="ml-auto inline-flex items-center gap-1.5 text-dense-meta text-muted-foreground">
                        <StatusLamp lamp="gray" variant="dot" title="Not computed here" />
                        requirement n/c
                      </span>
                    </div>
                  ))
                )}
                <p className={cn(FOOT, 'm-0')}>
                  Only one half of the ratio moves here. {MARGIN_UNRECORDED.stressed} So pressure after a shock has no
                  reading, and this panel shows the half that does.
                </p>
              </section>

              <section className={cn(positionsUi.panel, 'border-warning/40')} aria-label="Margin calls">
                <header className={positionsUi.panelHead}>
                  <span className={positionsUi.cap}>Margin calls</span>
                  <span className={positionsUi.panelTitle}>none shown</span>
                  <DenseTag variant="warning" size="cell">
                    ⚠ no field
                  </DenseTag>
                </header>
                <p className="m-0 px-3 py-2.5 text-xs leading-normal text-secondary-foreground text-pretty">
                  Pressure is the number to watch instead: it is the broker&rsquo;s own Cushion inverted, and at 1 there
                  is no excess liquidity left.
                </p>
                <p className={cn(FOOT, 'm-0')}>{MARGIN_UNRECORDED.calls}</p>
              </section>
            </div>

            <p className="m-0 border px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty mat-card">
              <span className="font-semibold text-secondary-foreground">Boundary.</span> This page reads the
              broker&rsquo;s margin. What backs the book and where the house gate sits are{' '}
              <Link to="/portfolio/backing" className={positionsUi.link}>
                Backing &amp; Model&rsquo;s
              </Link>
              ; how much of it is one bet is{' '}
              <Link to="/risk/portfolio" className={positionsUi.link}>
                Exposure&rsquo;s
              </Link>
              .
            </p>
          </>
        )}
      </section>
    </PageShell>
  )
}
