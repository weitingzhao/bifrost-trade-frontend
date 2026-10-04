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
import { withSymbolParam } from '@/lib/symbolLink'
import { ViewState } from '@bifrost/ui'
import { HeroCard, HeroRow, PageHead, PageHeadLink, PageShell } from '@/components/layout'
import { DenseTag, SegmentControl } from '@/components/data-display'
import { StatusLamp } from '@/components/StatusLamp'
import { positionsUi } from '@/components/positions/positionsUi'
import { PositionsStat } from '@/components/positions/PositionsStat'
import { BackingHeadroomPanel } from '@/components/positions/BackingHeadroomPanel'
import { fmtMvAbbrev } from '@/utils/positionsCharts'
import { fmtPct0 } from '@/utils/positions'
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

// Rev .62: a panel's foot is a rule, not a band.
const FOOT = 'border-t border-border px-3 py-1.5 text-dense-meta leading-normal text-muted-foreground text-pretty'

/** Tracks in ink (Rev .84–.85): the accent's lime fallback is gone. Row hover is the list grammar's. */
const TRACK = 'bg-[color-mix(in_srgb,var(--sk-ink)_8%,transparent)]'

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
        {/* §16.10 with §17 (one pass per page): the lead behind ⓘ, the way to
            the backing model a head action, the account switch in the toolbar. */}
        <PageHead
          title="Margin"
          info={PAGE_LEAD}
          actions={
            <PageHeadLink to="/portfolio/backing" title="What backs it — Backing & Model">
              Backing model →
            </PageHeadLink>
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
            {/* §16.2 (Rev .85): four heroes — the house's two lines and the
                broker's two — with Net liq and buying power in the strip under
                them. Sub-lines, links and state inks as they were. */}
            <HeroRow label="Margin at a glance">
              <HeroCard
                label="Backing used"
                value={judgment?.usedPct != null ? fmtPct0(judgment.usedPct) : '—'}
                valueClassName={judgment?.overGate ? 'text-warning' : 'text-foreground'}
                state={judgment?.overGate ? 'warn' : null}
                sub={
                  <>
                    of the pool · gate 85% ·{' '}
                    <Link to="/portfolio/backing" className={positionsUi.link}>
                      Backing →
                    </Link>
                  </>
                }
              />
              <HeroCard
                label="Headroom to gate"
                value={judgment && judgment.spendable > 0 ? fmtMvAbbrev(judgment.spendable) : '—'}
                sub="under the 85% house line · what Sizing spends from"
              />
              <HeroCard
                label="Maintenance"
                value={margin.maintMarginReq > 0 ? fmtMvAbbrev(margin.maintMarginReq) : '—'}
                sub={
                  margin.netLiquidation > 0
                    ? `${fmtPct0(margin.maintMarginReq / margin.netLiquidation)} of net liq`
                    : 'the broker’s own requirement'
                }
              />
              <HeroCard
                label="Pressure · 1 − Cushion"
                value={fmtPct0(margin.pressure)}
                valueClassName={(margin.pressure ?? 0) > PRESSURE_WARN ? 'text-warning' : 'text-foreground'}
                state={(margin.pressure ?? 0) > PRESSURE_WARN ? 'warn' : null}
                sub={
                  margin.excessLiquidity > 0
                    ? `${fmtMvAbbrev(margin.excessLiquidity)} excess left${margin.tightest ? ` · tightest ${margin.tightest.accountId}` : ''}`
                    : 'the broker’s Cushion, inverted'
                }
              />
            </HeroRow>
            <div data-sr-kpi="strip">
              <PositionsStat
                cap="Net liq"
                value={margin.netLiquidation > 0 ? fmtMvAbbrev(margin.netLiquidation) : '—'}
                sub={`${margin.accounts.length} funded ${margin.accounts.length === 1 ? 'account' : 'accounts'}`}
              />
              <PositionsStat
                cap="Options buying power"
                value={buyingPower > 0 ? fmtMvAbbrev(buyingPower) : '—'}
                sub="broker figure · IB"
              />
              {/* Rev .105: the per-account table is Accounts' — its fields'
                  home — and each account's Pressure is on Positions and
                  Backing's Margin by account strip. One door, not a copy. */}
              <Link to="/portfolio/accounts" className={cn(positionsUi.link, 'ml-auto self-center')}>
                by account → Accounts
              </Link>
            </div>

            <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(min(100%,21.25rem),1fr)] items-start gap-3 max-[1100px]:grid-cols-1">
              <section className={cn(positionsUi.panel, 'border-warning/40')} aria-label="Margin users">
                <header className={positionsUi.panelHead}>
                  <span className={positionsUi.cap}>Margin users</span>
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
                </header>
                {users.length === 0 ? (
                  <p className="m-0 px-3 py-3 text-dense-meta text-muted-foreground">
                    No name in this scope ties up capital the model service can measure.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table data-sr-table="" className="min-w-[640px]">
                      <thead>
                        <tr>
                          <th data-sr-col="entity">Symbol</th>
                          <th data-sr-col="num">Committed</th>
                          <th data-sr-col="num">At risk</th>
                          <th data-sr-col="tag">Risk</th>
                          <th>Share of committed</th>
                          <th data-sr-col="tag" />
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((u) => (
                          <tr key={u.symbol}>
                            <td data-sr-col="entity" className="font-mono font-bold text-entity-symbol">
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
                                <span className={cn('inline-block h-1.25 w-24 overflow-hidden rounded-sm', TRACK)}>
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
                            <td data-sr-col="tag">
                              <Link
                                to={withSymbolParam('/portfolio/positions', u.symbol)}
                                className={positionsUi.link}
                                title={`${u.symbol}'s lines on Positions`}
                              >
                                Positions →
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <p className={cn(FOOT, 'm-0')}>{MARGIN_UNRECORDED.perPosition}</p>
              </section>

              <div className="flex min-w-0 flex-col gap-3">
                <BackingHeadroomPanel
                  usedPct={judgment?.usedPct ?? null}
                  action={
                    <Link to="/risk/portfolio" className={positionsUi.link}>
                      the same rulers &rarr; Exposure
                    </Link>
                  }
                  foot={
                    <>
                      The same three rulers Risk &rsaquo; Exposure draws, from the same judgment. Usage under a shock
                      needs the pool re-priced at the shocked price, which is Backing&rsquo;s computation — so the
                      shocked rows read n/c, and what the shock costs is Exposure&rsquo;s{' '}
                      <Link to="/risk/portfolio#stress" className={positionsUi.link}>
                        Stress
                      </Link>
                      .
                    </>
                  }
                />

                <section className={cn(positionsUi.panel, 'border-warning/40')} aria-label="Margin calls">
                  <header className={positionsUi.panelHead}>
                    <span className={positionsUi.cap}>Margin calls</span>
                    <span className={positionsUi.panelTitle}>none shown</span>
                    <DenseTag variant="warning" size="cell">
                      ⚠ no field
                    </DenseTag>
                  </header>
                  <p className="m-0 px-3 py-2.5 text-xs leading-normal text-secondary-foreground text-pretty">
                    Pressure is the number to watch instead: it is the broker&rsquo;s own Cushion inverted, and at 100%
                    there is no excess liquidity left.
                  </p>
                  <p className={cn(FOOT, 'm-0')}>{MARGIN_UNRECORDED.calls}</p>
                </section>
              </div>
            </div>
          </>
        )}
    </PageShell>
  )
}
