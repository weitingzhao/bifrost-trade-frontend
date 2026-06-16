import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { HelpCircle, RefreshCw, Tag } from 'lucide-react'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { useQuotes } from '@/hooks/useQuotes'
import { useBenchmarks } from '@/hooks/useBenchmarks'
import { useExecutionsFreshness } from '@/hooks/useExecutionsFreshness'
import { useAccountsRefresh } from '@/hooks/useAccountsRefresh'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { PageHeader, PageShell } from '@/components/layout'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { OverviewDashboard } from '@/components/accounts/OverviewDashboard'
import { OverviewCompact } from '@/components/accounts/OverviewCompact'
import { PortfolioCategoryRing } from '@/components/accounts/PortfolioCategoryRing'
import { NetLiqChart } from '@/components/accounts/NetLiqChart'
import { StockPositionsTable } from '@/components/accounts/StockPositionsTable'
import { OptionPositionsTable } from '@/components/accounts/OptionPositionsTable'
import { CategoriesModal } from '@/components/accounts/CategoriesModal'
import { ExecutionImport } from '@/components/accounts/ExecutionImport'
import { AccountSummaryCard } from '@/components/accounts/AccountSummaryCard'
import { buildQuoteMap, buildCkMap, uniqueSymbols, uniqueContractKeys, formatLastUpdate } from '@/utils/positions'
import { cn } from '@/lib/utils'
import type { AccountSyncHeartbeat } from '@/types/monitor'

function SyncDaemonBadge({ hb }: { hb: AccountSyncHeartbeat }) {
  const alive = hb.daemon_alive === true
  const freshLabel = hb.last_ts != null ? formatLastUpdate(hb.last_ts) : ''

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium',
        alive
          ? 'bg-success-soft text-success'
          : 'bg-danger-soft text-danger',
      )}
      title={`Account Sync Daemon: ${alive ? 'running' : 'not running'}${freshLabel ? ` — last sync ${freshLabel}` : ''}`}
    >
      <span
        className={cn('h-1.5 w-1.5 rounded-full shrink-0', alive ? 'bg-success' : 'bg-danger')}
      />
      {alive ? `Synced ${freshLabel}` : 'Sync offline'}
    </span>
  )
}

export default function AccountsPage() {
  const queryClient = useQueryClient()
  const { data, isLoading, isError, error } = useMonitorStatus()
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [categoriesOpen, setCategoriesOpen] = useState(false)

  const accountsFetchedAt = data?.portfolio.accounts_fetched_at
  const { refresh, isRefreshing, feedback } = useAccountsRefresh(accountsFetchedAt)

  const accounts = [...(data?.portfolio.accounts ?? [])].sort((a, b) => {
    const nlqA = parseFloat(a.summary?.NetLiquidation ?? '0') || 0
    const nlqB = parseFloat(b.summary?.NetLiquidation ?? '0') || 0
    return nlqB - nlqA
  })
  const hasAccounts = accounts.length > 0
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

  if (isLoading) {
    return (
      <PageShell className="space-y-3">
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
        <Skeleton className="h-48 rounded-lg" />
      </PageShell>
    )
  }

  if (isError) {
    return (
      <PageShell>
        <Alert variant="destructive">
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      </PageShell>
    )
  }

  return (
    <PageShell className="space-y-3">
      <PageHeader
        breadcrumb={
          <p className="text-xs text-primary/90 font-medium">Portfolio / Accounts</p>
        }
        title="Accounts"
        actions={
          <>
            {data?.account_sync_daemon && (
              <SyncDaemonBadge hb={data.account_sync_daemon.heartbeat} />
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Page info"
                >
                  <HelpCircle className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                Multi-account summary &amp; positions from DB; auto-refresh every 1h.
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCategoriesOpen(true)}
                  aria-label="Manage position categories"
                >
                  <Tag className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Manage position categories</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => void refresh()}
                  disabled={isRefreshing}
                  aria-label="Refresh accounts and positions from IB"
                  aria-busy={isRefreshing}
                >
                  <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Monitor Account Client fetches accounts &amp; positions from IB, writes to DB, then updates display
              </TooltipContent>
            </Tooltip>
          </>
        }
      />

      <ExecutionImport
        accountsFetchedAt={accountsFetchedAt}
        hasAccounts={hasAccounts}
      />

      {feedback != null && feedback !== '' && (
        <p
          className={cn(
            'text-xs',
            feedback.startsWith('Refreshed') ? 'text-success' : 'text-muted-foreground',
          )}
        >
          {feedback}
        </p>
      )}

      {!hasAccounts ? (
        <>
          <OverviewCompact accounts={accounts} />
          <p className="text-sm text-muted-foreground">
            No account data (IB not connected or daemon has not written yet; after connection, data is pulled on heartbeat and written to accounts / account_positions)
          </p>
        </>
      ) : (
        <>
          <OverviewDashboard accounts={accounts} />

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2 xl:items-start">
            <PortfolioCategoryRing accounts={accounts} />
            <NetLiqChart accounts={accounts} />
          </div>

          {accounts.length > 1 && (
            <Tabs
              value={String(clampedIdx)}
              onValueChange={(v) => setSelectedIdx(Number(v))}
            >
              <TabsList variant="segment">
                {accounts.map((a, i) => (
                  <TabsTrigger key={a.account_id ?? i} value={String(i)}>
                    {a.account_id ?? `Account ${i + 1}`}
                    <span className="ml-1.5 text-xs opacity-60">
                      ({a.positions?.length ?? 0})
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}

          {account && (
            <AccountSummaryCard
              account={account}
              freshnessItems={freshnessData?.items ?? []}
            />
          )}

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
        onRefreshed={() => {
          void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.monitor.status })
        }}
      />
    </PageShell>
  )
}
