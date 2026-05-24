import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { RefreshCw, Tag } from 'lucide-react'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { useQuotes } from '@/hooks/useQuotes'
import { useBenchmarks } from '@/hooks/useBenchmarks'
import { useExecutionsFreshness } from '@/hooks/useExecutionsFreshness'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatusLamp } from '@/components/StatusLamp'
import { formatLastUpdate, fmtExecDaysAgo } from '@/utils/positions'
import { OverviewDashboard } from '@/components/accounts/OverviewDashboard'
import { PortfolioCategoryRing } from '@/components/accounts/PortfolioCategoryRing'
import { NetLiqChart } from '@/components/accounts/NetLiqChart'
import { StockPositionsTable } from '@/components/accounts/StockPositionsTable'
import { OptionPositionsTable } from '@/components/accounts/OptionPositionsTable'
import { CategoriesModal } from '@/components/accounts/CategoriesModal'
import { ExecutionImport } from '@/components/accounts/ExecutionImport'
import { postRefreshAccounts } from '@/api/monitor'
import { buildQuoteMap, buildCkMap, uniqueSymbols, uniqueContractKeys } from '@/utils/positions'
import { cn } from '@/lib/utils'
import type { AccountSyncHeartbeat, IbAccountSnapshot } from '@/types/monitor'
import type { ExecutionFreshnessItem } from '@/types/trading'

function fmtSummaryUsd(raw: string | undefined): string {
  if (!raw) return '—'
  const n = parseFloat(raw)
  return Number.isFinite(n)
    ? n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
    : '—'
}

function AccountSummary({
  account,
  freshnessItems,
}: {
  account: IbAccountSnapshot
  freshnessItems: ExecutionFreshnessItem[]
}) {
  const aid = account.account_id ?? ''
  const s = account.summary ?? {}

  const forAcc = freshnessItems.filter((r) => r.account_id === aid)
  const flexItem = forAcc.find((r) => r.source === 'flex_trades') ?? null
  const streamItems = forAcc.filter((r) => r.source !== 'flex_trades')
  const streamBest = streamItems.reduce<ExecutionFreshnessItem | null>(
    (best, r) => (best == null || (r.latest_exec_ts ?? 0) > (best.latest_exec_ts ?? 0) ? r : best),
    null
  )

  return (
    <div className="space-y-2">
      {aid && (
        <p className="text-xs text-muted-foreground font-mono">{aid}</p>
      )}
      <div className="grid grid-cols-3 gap-3 text-sm">
        {([
          ['NetLiquidation', 'Net Liquidation'],
          ['TotalCashValue', 'Cash'],
          ['BuyingPower', 'Buying Power'],
        ] as const).map(([key, label]) => (
          <div key={key} className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-base font-semibold font-mono mt-0.5">{fmtSummaryUsd(s[key])}</p>
          </div>
        ))}
      </div>
      {(flexItem != null || streamBest != null) && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground px-0.5">
          <span className="font-medium text-foreground/70">IB data:</span>
          <span>Flex {fmtExecDaysAgo(flexItem?.days_since_latest)}</span>
          <span>Stream {fmtExecDaysAgo(streamBest?.days_since_latest)}</span>
        </div>
      )}
    </div>
  )
}

function fmtTs(ts: number | null | undefined): string {
  if (ts == null) return '—'
  return new Date(ts * 1000).toLocaleString()
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed p-8 text-center space-y-1">
      <p className="text-sm font-medium">No account data</p>
      <p className="text-xs text-muted-foreground">
        Ensure IB is connected and the Account Sync daemon is running, then click Refresh.
      </p>
    </div>
  )
}

function SyncDaemonBadge({ hb }: { hb: AccountSyncHeartbeat }) {
  const agoStr = formatLastUpdate(hb.last_ts)
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <StatusLamp lamp={hb.daemon_alive ? 'green' : 'red'} />
      <span>Sync {hb.daemon_alive ? 'running' : 'offline'}</span>
      {hb.last_ts != null && <span className="opacity-60">{agoStr}</span>}
    </div>
  )
}

export default function AccountsPage() {
  const { data, isLoading, isError, error } = useMonitorStatus()
  const queryClient = useQueryClient()
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const accounts = [...(data?.portfolio.accounts ?? [])].sort((a, b) => {
    const nlqA = parseFloat(a.summary?.NetLiquidation ?? '0') || 0
    const nlqB = parseFloat(b.summary?.NetLiquidation ?? '0') || 0
    return nlqB - nlqA
  })
  const clampedIdx = Math.min(selectedIdx, Math.max(0, accounts.length - 1))
  const account = accounts[clampedIdx]

  const stkSymbols = uniqueSymbols(accounts)
  const optCks = uniqueContractKeys(accounts)

  const { data: quotesData } = useQuotes(stkSymbols, optCks)
  const { data: benchData } = useBenchmarks(stkSymbols)
  const { data: freshnessData } = useExecutionsFreshness()

  const quotesBySymbol = buildQuoteMap(quotesData)
  const quotesByCk = buildCkMap(quotesData)
  const benchBySymbol = benchData?.benchmarks ?? {}

  const stkPositions = account?.positions?.filter((p) => p.secType?.toUpperCase() === 'STK') ?? []
  const optPositions = account?.positions?.filter((p) => p.secType?.toUpperCase() === 'OPT') ?? []

  async function handleRefresh() {
    setIsRefreshing(true)
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 5_000)
    await postRefreshAccounts(ctrl.signal).catch(() => null).finally(() => clearTimeout(timer))
    setIsRefreshing(false)
    void queryClient.invalidateQueries({ queryKey: ['monitor', 'status'] })
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
        <Skeleton className="h-48 rounded-lg" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">Accounts</h1>
          {data?.account_sync_daemon && (
            <SyncDaemonBadge hb={data.account_sync_daemon.heartbeat} />
          )}
          {accounts.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {accounts.length} account{accounts.length > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {data?.portfolio.accounts_fetched_at != null && (
            <span className="text-xs text-muted-foreground">
              Updated {fmtTs(data.portfolio.accounts_fetched_at)}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', isRefreshing && 'animate-spin')} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCategoriesOpen(true)}
          >
            <Tag className="h-3.5 w-3.5 mr-1.5" />
            Categories
          </Button>
        </div>
      </div>

      {/* Execution import + data freshness — immediately below header, matching legacy layout */}
      <ExecutionImport accountsFetchedAt={data?.portfolio.accounts_fetched_at} />

      {/* Cross-account overview */}
      <OverviewDashboard accounts={accounts} />

      {/* Charts row — Portfolio Category Ring + Net Liq, between overview and positions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PortfolioCategoryRing accounts={accounts} />
        <NetLiqChart accounts={accounts} />
      </div>

      {accounts.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Multi-account tabs */}
          {accounts.length > 1 && (
            <Tabs
              value={String(clampedIdx)}
              onValueChange={(v) => setSelectedIdx(Number(v))}
            >
              <TabsList>
                {accounts.map((a, i) => (
                  <TabsTrigger key={i} value={String(i)}>
                    {a.account_id ?? `Account ${i + 1}`}
                    <span className="ml-1.5 text-xs opacity-60">
                      ({a.positions?.length ?? 0})
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}

          {/* Account summary metrics */}
          {account && <AccountSummary account={account} freshnessItems={freshnessData?.items ?? []} />}

          {/* Positions */}
          <StockPositionsTable
            positions={stkPositions}
            quotesBySymbol={quotesBySymbol}
            benchBySymbol={benchBySymbol}
            onCategoryClick={() => setCategoriesOpen(true)}
          />

          <OptionPositionsTable
            positions={optPositions}
            quotesByCk={quotesByCk}
            quotesBySymbol={quotesBySymbol}
          />
        </>
      )}

      <CategoriesModal
        open={categoriesOpen}
        onOpenChange={setCategoriesOpen}
        accounts={accounts}
        onRefreshed={() => queryClient.invalidateQueries({ queryKey: ['monitor', 'status'] })}
      />
    </div>
  )
}
