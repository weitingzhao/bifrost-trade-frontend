import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { HelpCircle, RefreshCw, Tag } from 'lucide-react'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { useQuotes } from '@/hooks/useQuotes'
import { useBenchmarks } from '@/hooks/useBenchmarks'
import { useLatestBars } from '@/hooks/useLatestBars'
import { useExecutionsFreshness } from '@/hooks/useExecutionsFreshness'
import { useFlexCoverageFreshness } from '@/hooks/useFlexCoverageFreshness'
import { useAccountsRefresh } from '@/hooks/useAccountsRefresh'
import { ViewState } from '@bifrost/ui'
import { PageHead, PageHeadAction, PageShell } from '@/components/layout'
import { usePreviewState } from '@/hooks/usePreviewState'
import { failedDetail, sourceState, staleDetail } from '@/lib/viewState'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { OverviewCompact } from '@/components/accounts/OverviewCompact'
import { buildQuoteMap, buildCkMap, uniqueSymbols, uniqueContractKeys } from '@/utils/positions'
import { flattenPositions, splitBySecType } from '@/utils/positionsGrouping'
import { buildSpotResolver, repriceRows } from '@/utils/spotPrice'
import {
  flexPullTsFromCoverage,
  latestClientExecFreshness,
  latestFlexFreshness,
  pullAndRecLine,
} from '@/utils/accountsFreshness'
import { cn } from '@/lib/utils'
import { flexClockReading, ibClockReading } from '@/utils/accountsClocks'
import { accountRoles, buildFreshnessRows } from '@/utils/accountsFreshnessRows'
import { buildBrokerRows, unrealizedPnlTotal } from './accounts/accountsBrokerRows'
import { AccountsClockBadge } from './accounts/AccountsClockBadge'
import { AccountsFreshnessBand } from './accounts/AccountsFreshnessBand'
import { AccountsBrokerBand } from './accounts/AccountsBrokerBand'
import { AccountsComposedBand } from './accounts/AccountsComposedBand'
import { useTradingCalendar } from '@/hooks/useTradingCalendar'
import { AccountsHoldingsBand } from './accounts/AccountsHoldingsBand'
import { AccountsInspector, type AccountsInspectorState } from './accounts/AccountsInspector'
import { accountsUi } from './accounts/accountsUi'

const PAGE_LEAD =
  'What the broker says, account by account. Freshness first — stale account data poisons every page downstream.'

export default function AccountsPage() {
  const queryClient = useQueryClient()
  const statusQ = useMonitorStatus()
  const { data } = statusQ
  const preview = usePreviewState()
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [clockHelp, setClockHelp] = useState(false)
  const [inspector, setInspector] = useState<AccountsInspectorState>({ type: null })

  const accountsFetchedAt = data?.portfolio.accounts_fetched_at
  const { refresh, isRefreshing, feedback } = useAccountsRefresh(accountsFetchedAt)

  const accounts = useMemo(
    () =>
      [...(data?.portfolio.accounts ?? [])].sort((a, b) => {
        const nlqA = parseFloat(a.summary?.NetLiquidation ?? '0') || 0
        const nlqB = parseFloat(b.summary?.NetLiquidation ?? '0') || 0
        return nlqB - nlqA
      }),
    [data],
  )
  const hasAccounts = accounts.length > 0
  const selected =
    accounts.find((a) => a.account_id === selectedAccountId) ?? accounts[0] ?? null
  const roles = useMemo(
    () => accountRoles(accounts.map((a) => a.account_id ?? '')),
    [accounts],
  )

  const stkSymbols = uniqueSymbols(accounts)
  const optCks = uniqueContractKeys(accounts)

  const { data: quotesData } = useQuotes(stkSymbols, optCks)
  const { data: benchData } = useBenchmarks(stkSymbols)
  const { data: freshnessData } = useExecutionsFreshness()
  const { data: flexCoverage } = useFlexCoverageFreshness()
  const execItems = useMemo(() => freshnessData?.items ?? [], [freshnessData])
  const tradingCal = useTradingCalendar()
  const daemonAlive = data?.account_sync_daemon?.heartbeat.daemon_alive === true
  const ibConnected = data?.daemon.heartbeat?.ib_connected === true
  const flexPullTs = flexPullTsFromCoverage(flexCoverage?.dimensions ?? [])
  const flexRecTs = latestFlexFreshness(execItems)?.latest_exec_ts ?? null
  const flexClockLine = pullAndRecLine(flexPullTs, flexRecTs)

  const ibClock = ibClockReading({
    daemonAlive,
    ibConnected,
    fetchedAt: accountsFetchedAt,
    twsRecDays: latestClientExecFreshness(execItems)?.days_since_latest ?? null,
    calendar: tradingCal,
  })
  const flexClock = flexClockReading({
    pullTs: flexPullTs,
    recDays: latestFlexFreshness(execItems)?.days_since_latest ?? null,
  })

  const quotesBySymbol = useMemo(() => buildQuoteMap(quotesData), [quotesData])
  const quotesByCk = useMemo(() => buildCkMap(quotesData), [quotesData])
  const benchBySymbol = benchData?.benchmarks ?? {}

  const barsBySymbol = useLatestBars(stkSymbols)
  const allRows = useMemo(() => {
    const raw = flattenPositions(accounts)
    return repriceRows(raw, buildSpotResolver(quotesBySymbol, raw, barsBySymbol), barsBySymbol)
  }, [accounts, quotesBySymbol, barsBySymbol])
  const { stocks: allStocks } = splitBySecType(allRows)

  const freshnessRows = useMemo(
    () => buildFreshnessRows(execItems, roles),
    [execItems, roles],
  )
  const broker = useMemo(() => buildBrokerRows(accounts, execItems), [accounts, execItems])
  const totalNetLiq = broker.totals.netLiq
  const selectedBroker = broker.rows.find((r) => r.accountId === selected?.account_id)

  const stkPositions = selected?.positions?.filter((p) => p.secType?.toUpperCase() === 'STK') ?? []
  const optPositions = selected?.positions?.filter((p) => p.secType?.toUpperCase() === 'OPT') ?? []

  function closeInspector() {
    setInspector({ type: null })
  }

  // §17.1: the monitor's account read is the page's one source.
  const pageState = preview === 'loading' || preview === 'failed' || preview === 'stale' ? preview : sourceState(statusQ)
  const retry = () => void statusQ.refetch()

  return (
    <PageShell padding="compact" className="space-y-3">
        {/* §16.10: the lead behind ⓘ; the two clocks — never one — are the
            stamp (IB pull/rec and Flex); the help, Categories and the IB
            refresh are the head's actions. */}
        <PageHead
          title="Accounts"
          info={PAGE_LEAD}
          stamp={
            <span className="inline-flex flex-wrap items-center gap-1.5">
              <AccountsClockBadge reading={ibClock} />
              <AccountsClockBadge reading={flexClock} />
            </span>
          }
          actions={
            <>
              <PageHeadAction onClick={() => setClockHelp((v) => !v)} title="What Pull and Rec mean — two clocks, never one">
                <HelpCircle className="size-3.5" aria-label="What Pull and Rec mean" />
              </PageHeadAction>
              <PageHeadAction onClick={() => setInspector({ type: 'categories' })} title="Manage the Owner’s position categories">
                <Tag className="size-3.5" aria-hidden /> Categories
              </PageHeadAction>
              <PageHeadAction
                onClick={() => void refresh()}
                disabled={isRefreshing}
                title="Fetches accounts & positions from IB, writes to DB, then updates display"
              >
                <RefreshCw className={cn('size-3.5', isRefreshing && 'animate-spin')} aria-hidden />
                {isRefreshing ? ' Refreshing…' : ' Refresh'}
              </PageHeadAction>
            </>
          }
        />

        {pageState === 'stale' ? (
          <ViewState
            kind="stale"
            title="Couldn’t refresh the accounts"
            detail={staleDetail(statusQ, 'balances and positions since then are not shown.')}
            onAction={retry}
          />
        ) : null}
        {pageState === 'loading' ? (
          <section className={accountsUi.panel}>
            <ViewState kind="loading" title="Loading accounts" rows={6} cols={6} />
          </section>
        ) : pageState === 'failed' ? (
          <section className={accountsUi.panel}>
            <ViewState
              kind="failed"
              title="Couldn’t load the accounts"
              detail={failedDetail(statusQ, 'Nothing below was read — not an empty account.')}
              onAction={retry}
            />
          </section>
        ) : (
        <>
        {clockHelp ? (
          <div className={accountsUi.helpPanel}>
            <div className={accountsUi.helpHead}>
              <span className={accountsUi.helpCap}>Two clocks, never one</span>
              <p className={cn(accountsUi.helpProse, 'flex-1')}>
                A fresh pull with an old record is the normal case: we asked today, and the newest
                thing the broker had to give was days old. One merged &quot;updated&quot; number
                would report that as fresh.
              </p>
              <button
                type="button"
                className={accountsUi.helpClose}
                onClick={() => setClockHelp(false)}
                aria-label="Close clock help"
              >
                ✕
              </button>
            </div>
            <div className={accountsUi.helpBody}>
              <p className={accountsUi.helpProse}>
                <span className="font-mono text-foreground/85">Pull</span> — when we last asked this
                source. Late pull = our job. Three readings: a time,{' '}
                <span className="font-mono">STALE</span> in amber when the link is up but the
                snapshot is not advancing, and <span className="font-mono">DISCONNECTED</span> in
                grey when TWS is not logged in.
              </p>
              <p className={accountsUi.helpProse}>
                <span className="font-mono text-foreground/85">Rec</span> — the newest record that
                arrived. Old record = either nothing happened, or the link is dry.
              </p>
              <p className={accountsUi.helpProse}>
                Red is a real fault. Amber is degraded — connected and not advancing. Grey is no
                reading: an unopened TWS session and a dormant account are both grey, never a zero
                and never &quot;fine&quot;.
              </p>
            </div>
          </div>
        ) : null}

        {feedback != null && feedback !== '' ? (
          <p
            className={cn(
              'text-xs',
              feedback.startsWith('Refreshed') ? 'text-success' : 'text-muted-foreground',
            )}
          >
            {feedback}
          </p>
        ) : null}

        <AccountsFreshnessBand
          rows={freshnessRows}
          fetchedAt={accountsFetchedAt}
          hasAccounts={hasAccounts}
          flexClockLine={flexClockLine}
        />

        {!hasAccounts ? (
          <>
            <OverviewCompact accounts={accounts} />
            <p className="text-sm text-muted-foreground">
              No account data (IB not connected or daemon has not written yet; after connection,
              data is pulled on heartbeat and written to accounts / account_positions)
            </p>
          </>
        ) : (
          <>
            <AccountsBrokerBand
              rows={broker.rows}
              totals={broker.totals}
              selectedAccountId={selected?.account_id ?? null}
              onSelect={setSelectedAccountId}
              unrealizedPnl={unrealizedPnlTotal(accounts)}
            />

            <AccountsComposedBand
              accounts={accounts}
              allStocks={allStocks}
              allPositions={allRows}
              quotesBySymbol={quotesBySymbol}
              benchBySymbol={benchBySymbol}
              totalNetLiq={totalNetLiq}
              onSymbolClick={(symbol) => setInspector({ type: 'stock', symbol })}
            />

            {selected ? (
              <AccountsHoldingsBand
                accountId={selected.account_id ?? '—'}
                roleLabel={
                  selectedBroker?.roleNote
                    ? `${selectedBroker.role} · ${selectedBroker.roleNote}`
                    : (selectedBroker?.role ?? roles[selected.account_id ?? ''] ?? '')
                }
                dormant={selectedBroker?.dormant === true}
                stockPositions={stkPositions}
                optionPositions={optPositions}
                quotesBySymbol={quotesBySymbol}
                quotesByCk={quotesByCk}
                benchBySymbol={benchBySymbol}
                onSymbolClick={(symbol) =>
                  setInspector({
                    type: 'stock',
                    symbol,
                    accountId: selected.account_id,
                  })
                }
                onCategoryClick={() => setInspector({ type: 'categories' })}
              />
            ) : null}
          </>
        )}
        </>
        )}

      <AccountsInspector
        state={inspector}
        accounts={accounts}
        onClose={closeInspector}
        onRefreshed={() => {
          void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.monitor.status })
        }}
      />
    </PageShell>
  )
}
