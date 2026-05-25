import { useState, useMemo, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { useOpportunities } from '@/hooks/useStrategies'
import { useLedgerExecutions, useLedgerExecutionsBook } from '@/hooks/useLedgerExecutions'
import { deleteExecution } from '@/api/trading'
import { DeleteConfirmDialog } from '@/components/positions/DeleteConfirmDialog'
import { ExecutionFormModal } from '@/components/positions/ExecutionFormModal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { Execution, StrategyOpportunity } from '@/types/positions'
import type { StatusResponse } from '@/types/monitor'
import {
  LEDGER_SINCE_PRESET_TABS,
  LEDGER_SUMMARY_PERIOD_TABS,
  getSinceTradeDateRange,
  executionMatchesLedgerTradePeriod,
  ledgerExecutionDateKey,
  rollupOptionsFromMonthly,
  rollupStocksFromMonthly,
  formatPeriodLabel,
} from '@/utils/ledger/summaryPeriod'
import type { LedgerSincePreset, LedgerSummaryPeriod } from '@/utils/ledger/summaryPeriod'
import {
  buildOptExecutionGroups,
  isOptionExpired,
} from '@/utils/ledger/optExecutionGroups'
import type { OptExecutionGroup } from '@/utils/ledger/optExecutionGroups'
import {
  buildPositionCategoryByAccountContract,
  getStkLedgerBucketForExecution,
} from '@/utils/ledger/stkBuckets'
import type { StkLedgerBucket } from '@/utils/ledger/stkBuckets'
import { executionDateStr } from '@/utils/ledger/performanceUtils'

type MainTab = 'strategy' | 'instance' | 'options' | 'stocks' | 'fixed_income' | 'cash_like'

const TAB_GROUPS: { label: string; tabs: { id: MainTab; label: string }[] }[] = [
  {
    label: 'Attribution',
    tabs: [
      { id: 'strategy', label: 'Strategy' },
      { id: 'instance', label: 'Instance' },
    ],
  },
  {
    label: 'Instruments',
    tabs: [
      { id: 'options', label: 'Options' },
      { id: 'stocks', label: 'Stocks' },
      { id: 'fixed_income', label: 'Fixed Income' },
      { id: 'cash_like', label: 'Cash-like' },
    ],
  },
]

const PAGE_SIZE = 50

function formatCurrency(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function formatPrice(n: number | null | undefined): string {
  if (n == null) return '—'
  return n.toFixed(2)
}

function getAccounts(status: StatusResponse | null | undefined): string[] {
  const accts: string[] = []
  const host = status?.config?.ib_client?.account?.event_host
  const sec = status?.config?.ib_client?.account?.event_secondary
  if (host) accts.push(host)
  if (sec) accts.push(sec)
  return accts
}

function execMonthKey(e: Execution): string {
  const d = ledgerExecutionDateKey(e.trade_date ?? null, e.time)
  if (!d) return '0000-00'
  return d.slice(0, 7)
}

export default function TradeLedgerPage() {
  const { data: status } = useMonitorStatus()
  const { data: oppData } = useOpportunities()
  const queryClient = useQueryClient()

  const { data: canonData, isLoading: canonLoading } = useLedgerExecutions({ limit: 0, enabled: true })
  const { data: bookData, isLoading: bookLoading } = useLedgerExecutionsBook({ limit: 0, enabled: true })

  const [sincePreset, setSincePreset] = useState<LedgerSincePreset>('all')
  const [accountFilter, setAccountFilter] = useState<string>('all')
  const [symbolFilter, setSymbolFilter] = useState('')
  const [activeTab, setActiveTab] = useState<MainTab>('options')
  const [summaryPeriod, setSummaryPeriod] = useState<LedgerSummaryPeriod>('month')
  const [summaryOpen, setSummaryOpen] = useState(true)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [stkPage, setStkPage] = useState(0)

  const [editExec, setEditExec] = useState<Execution | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Execution | null>(null)

  const accounts = useMemo(() => getAccounts(status), [status])

  const dateRange = useMemo(() => getSinceTradeDateRange(sincePreset), [sincePreset])

  const catMap = useMemo(
    () => buildPositionCategoryByAccountContract(status ?? null),
    [status],
  )

  const opportunitiesMap = useMemo(() => {
    const m = new Map<number, StrategyOpportunity>()
    if (oppData?.items) {
      for (const o of oppData.items) m.set(o.strategy_opportunity_id, o)
    }
    return m
  }, [oppData])

  const filterExec = useCallback((e: Execution): boolean => {
    if (!executionMatchesLedgerTradePeriod(e.trade_date ?? null, e.time, dateRange)) return false
    if (accountFilter !== 'all' && e.account_id !== accountFilter) return false
    if (symbolFilter && !e.symbol.toLowerCase().includes(symbolFilter.toLowerCase())) return false
    return true
  }, [dateRange, accountFilter, symbolFilter])

  const canonFiltered = useMemo(
    () => (canonData?.items ?? []).filter(filterExec),
    [canonData, filterExec],
  )

  const bookFiltered = useMemo(
    () => (bookData?.items ?? []).filter(filterExec),
    [bookData, filterExec],
  )

  // Options groups
  const optGroups = useMemo(() => buildOptExecutionGroups(bookFiltered), [bookFiltered])
  const closedOptGroups = useMemo(() => optGroups.filter((g) => g.status === 'realized'), [optGroups])
  const openOptGroups = useMemo(() => optGroups.filter((g) => g.status === 'unrealized'), [optGroups])

  // STK buckets
  const stkByBucket = useMemo(() => {
    const buckets: Record<StkLedgerBucket, Execution[]> = { stocks: [], fixed_income: [], cash_like: [] }
    for (const e of canonFiltered) {
      if (e.sec_type !== 'STK') continue
      const bucket = getStkLedgerBucketForExecution(e, catMap)
      if (bucket) buckets[bucket].push(e)
    }
    for (const k of Object.keys(buckets) as StkLedgerBucket[]) {
      buckets[k].sort((a, b) => {
        const da = a.trade_date ?? ''
        const db = b.trade_date ?? ''
        if (da !== db) return db.localeCompare(da)
        return (b.time ?? 0) - (a.time ?? 0)
      })
    }
    return buckets
  }, [canonFiltered, catMap])

  // Strategy grouping
  const strategyGroups = useMemo(() => {
    const map = new Map<number | null, Execution[]>()
    for (const e of bookFiltered) {
      const oid = e.strategy_opportunity_id ?? null
      const arr = map.get(oid) ?? []
      arr.push(e)
      map.set(oid, arr)
    }
    return map
  }, [bookFiltered])

  // Instance grouping
  const instanceGroups = useMemo(() => {
    const withInst = new Map<number, Execution[]>()
    const noInst: Execution[] = []
    for (const e of bookFiltered) {
      if (e.strategy_instance_id) {
        const arr = withInst.get(e.strategy_instance_id) ?? []
        arr.push(e)
        withInst.set(e.strategy_instance_id, arr)
      } else {
        noInst.push(e)
      }
    }
    return { withInst, noInst }
  }, [bookFiltered])

  // Period summary for options
  const optionSummaryRows = useMemo(() => {
    const monthly = new Map<string, { count: number; realizedPnl: number }>()
    for (const g of closedOptGroups) {
      const mk = g.trades.length > 0 ? execMonthKey(g.trades[0]) : '0000-00'
      const prev = monthly.get(mk) ?? { count: 0, realizedPnl: 0 }
      prev.count += 1
      prev.realizedPnl += g.realized_pnl
      monthly.set(mk, prev)
    }
    return rollupOptionsFromMonthly(Array.from(monthly.entries()), summaryPeriod)
  }, [closedOptGroups, summaryPeriod])

  // Period summary for STK bucket
  const stkSummaryRows = useMemo(() => {
    const tab = activeTab as StkLedgerBucket
    const execs = stkByBucket[tab] ?? []
    const monthly = new Map<string, { count: number; notional: number; realizedPnl: number }>()
    for (const e of execs) {
      const mk = execMonthKey(e)
      const prev = monthly.get(mk) ?? { count: 0, notional: 0, realizedPnl: 0 }
      prev.count += 1
      prev.notional += Math.abs(e.qty * e.price)
      prev.realizedPnl += e.realized_pnl ?? 0
      monthly.set(mk, prev)
    }
    return rollupStocksFromMonthly(Array.from(monthly.entries()), summaryPeriod)
  }, [activeTab, stkByBucket, summaryPeriod])

  function toggleGroup(key: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function handleDelete() {
    if (!deleteTarget?.account_executions_id) return
    await deleteExecution(deleteTarget.account_executions_id)
    queryClient.invalidateQueries({ queryKey: ['trading', 'executions'] })
  }

  const isLoading = canonLoading || bookLoading

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Trade Ledger</h1>

      {/* Quick Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          {LEDGER_SINCE_PRESET_TABS.map((t) => (
            <Button
              key={t.id}
              size="sm"
              variant={sincePreset === t.id ? 'default' : 'outline'}
              className="h-7 text-xs"
              onClick={() => setSincePreset(t.id)}
            >
              {t.label}
            </Button>
          ))}
        </div>

        {accounts.length > 0 && (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant={accountFilter === 'all' ? 'default' : 'outline'}
              className="h-7 text-xs"
              onClick={() => setAccountFilter('all')}
            >
              All
            </Button>
            {accounts.map((a) => (
              <Button
                key={a}
                size="sm"
                variant={accountFilter === a ? 'default' : 'outline'}
                className="h-7 text-xs"
                onClick={() => setAccountFilter(a)}
              >
                {a}
              </Button>
            ))}
          </div>
        )}

        <Input
          placeholder="Filter symbol…"
          value={symbolFilter}
          onChange={(e) => setSymbolFilter(e.target.value)}
          className="h-7 w-36 text-xs"
        />
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-4 border-b pb-1">
        {TAB_GROUPS.map((group) => (
          <div key={group.label} className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground mr-1">{group.label}:</span>
            {group.tabs.map((t) => (
              <Button
                key={t.id}
                size="sm"
                variant={activeTab === t.id ? 'default' : 'ghost'}
                className="h-7 text-xs"
                onClick={() => { setActiveTab(t.id); setStkPage(0) }}
              >
                {t.label}
              </Button>
            ))}
          </div>
        ))}
      </div>

      {/* Period Summary */}
      <Collapsible open={summaryOpen} onOpenChange={setSummaryOpen}>
        <div className="flex items-center gap-2">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2">
              {summaryOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <span className="ml-1 text-xs font-medium">Period Summary</span>
            </Button>
          </CollapsibleTrigger>
          <div className="flex gap-1">
            {LEDGER_SUMMARY_PERIOD_TABS.map((p) => (
              <Button
                key={p.id}
                size="sm"
                variant={summaryPeriod === p.id ? 'secondary' : 'ghost'}
                className="h-6 text-xs px-2"
                onClick={() => setSummaryPeriod(p.id)}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>
        <CollapsibleContent className="mt-2">
          {activeTab === 'options' && (
            <SummaryTable
              rows={optionSummaryRows.map(([k, v]) => ({
                period: formatPeriodLabel(k, summaryPeriod),
                col1Label: 'Closed Groups',
                col1: String(v.count),
                pnl: v.realizedPnl,
              }))}
            />
          )}
          {(activeTab === 'stocks' || activeTab === 'fixed_income' || activeTab === 'cash_like') && (
            <SummaryTable
              rows={stkSummaryRows.map(([k, v]) => ({
                period: formatPeriodLabel(k, summaryPeriod),
                col1Label: 'Trades',
                col1: String(v.count),
                col2Label: 'Notional',
                col2: formatCurrency(v.notional),
                pnl: v.realizedPnl,
              }))}
            />
          )}
          {(activeTab === 'strategy' || activeTab === 'instance') && (
            <p className="text-xs text-muted-foreground">Select Options or STK tab for period summary.</p>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      )}

      {/* Tab Content */}
      {!isLoading && activeTab === 'options' && (
        <OptionsTabContent
          closedGroups={closedOptGroups}
          openGroups={openOptGroups}
          expandedGroups={expandedGroups}
          toggleGroup={toggleGroup}
          onEdit={setEditExec}
          onDelete={setDeleteTarget}
        />
      )}

      {!isLoading && (activeTab === 'stocks' || activeTab === 'fixed_income' || activeTab === 'cash_like') && (
        <StkTabContent
          executions={stkByBucket[activeTab]}
          page={stkPage}
          setPage={setStkPage}
          onEdit={setEditExec}
          onDelete={setDeleteTarget}
        />
      )}

      {!isLoading && activeTab === 'strategy' && (
        <StrategyTabContent
          groups={strategyGroups}
          opportunitiesMap={opportunitiesMap}
          expandedGroups={expandedGroups}
          toggleGroup={toggleGroup}
        />
      )}

      {!isLoading && activeTab === 'instance' && (
        <InstanceTabContent
          withInst={instanceGroups.withInst}
          noInst={instanceGroups.noInst}
          opportunitiesMap={opportunitiesMap}
          expandedGroups={expandedGroups}
          toggleGroup={toggleGroup}
        />
      )}

      {/* Modals */}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        title="Delete execution"
        message={`Delete execution #${deleteTarget?.account_executions_id ?? ''} (${deleteTarget?.symbol ?? ''} ${deleteTarget?.side ?? ''})? This cannot be undone.`}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />

      {editExec && (
        <ExecutionFormModal
          open={!!editExec}
          exec={editExec}
          accountOptions={accounts.length > 0 ? accounts : [editExec.account_id]}
          onClose={() => setEditExec(null)}
          onSuccess={() => {
            setEditExec(null)
            queryClient.invalidateQueries({ queryKey: ['trading', 'executions'] })
          }}
        />
      )}
    </div>
  )
}

// --- Sub-components ---

function SummaryTable({ rows }: {
  rows: { period: string; col1Label: string; col1: string; col2Label?: string; col2?: string; pnl: number }[]
}) {
  if (rows.length === 0) return <p className="text-xs text-muted-foreground">No data for this period.</p>
  const hasCol2 = rows.some((r) => r.col2Label)
  return (
    <div className="rounded border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="text-xs">
            <TableHead className="h-7">Period</TableHead>
            <TableHead className="h-7">{rows[0].col1Label}</TableHead>
            {hasCol2 && <TableHead className="h-7">{rows[0].col2Label}</TableHead>}
            <TableHead className="h-7 text-right">Realized PnL</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.period} className="text-xs">
              <TableCell className="py-1">{r.period}</TableCell>
              <TableCell className="py-1">{r.col1}</TableCell>
              {hasCol2 && <TableCell className="py-1">{r.col2 ?? ''}</TableCell>}
              <TableCell className={cn('py-1 text-right font-mono', r.pnl >= 0 ? 'text-green-600' : 'text-red-500')}>
                {formatCurrency(r.pnl)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function OptionsTabContent({
  closedGroups,
  openGroups,
  expandedGroups,
  toggleGroup,
  onEdit,
  onDelete,
}: {
  closedGroups: OptExecutionGroup[]
  openGroups: OptExecutionGroup[]
  expandedGroups: Set<string>
  toggleGroup: (k: string) => void
  onEdit: (e: Execution) => void
  onDelete: (e: Execution) => void
}) {
  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-medium mb-2">Closed Contracts ({closedGroups.length})</h3>
        {closedGroups.length === 0 ? (
          <p className="text-xs text-muted-foreground">No closed option groups.</p>
        ) : (
          <OptGroupsTable
            groups={closedGroups}
            showNetQty={false}
            expandedGroups={expandedGroups}
            toggleGroup={toggleGroup}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        )}
      </section>
      <section>
        <h3 className="text-sm font-medium mb-2">Open / Orphan Contracts ({openGroups.length})</h3>
        {openGroups.length === 0 ? (
          <p className="text-xs text-muted-foreground">No open option groups.</p>
        ) : (
          <OptGroupsTable
            groups={openGroups}
            showNetQty
            expandedGroups={expandedGroups}
            toggleGroup={toggleGroup}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        )}
      </section>
    </div>
  )
}

function OptGroupsTable({
  groups,
  showNetQty,
  expandedGroups,
  toggleGroup,
  onEdit,
  onDelete,
}: {
  groups: OptExecutionGroup[]
  showNetQty: boolean
  expandedGroups: Set<string>
  toggleGroup: (k: string) => void
  onEdit: (e: Execution) => void
  onDelete: (e: Execution) => void
}) {
  return (
    <div className="rounded border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="text-xs">
            <TableHead className="h-7 w-8" />
            <TableHead className="h-7">Contract</TableHead>
            {!showNetQty && <TableHead className="h-7 text-right">Buy Avg</TableHead>}
            {!showNetQty && <TableHead className="h-7 text-right">Sell Avg</TableHead>}
            {showNetQty && <TableHead className="h-7 text-right">Net Qty</TableHead>}
            <TableHead className="h-7 text-right">Qty</TableHead>
            <TableHead className="h-7 text-right">Realized PnL</TableHead>
            <TableHead className="h-7 text-right">Trades</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((g) => {
            const key = g.contract_key
            const expanded = expandedGroups.has(key)
            const expired = isOptionExpired(g.expiry)
            return (
              <OptGroupRow
                key={key}
                group={g}
                expanded={expanded}
                expired={expired}
                showNetQty={showNetQty}
                onToggle={() => toggleGroup(key)}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

function OptGroupRow({
  group,
  expanded,
  expired,
  showNetQty,
  onToggle,
  onEdit,
  onDelete,
}: {
  group: OptExecutionGroup
  expanded: boolean
  expired: boolean
  showNetQty: boolean
  onToggle: () => void
  onEdit: (e: Execution) => void
  onDelete: (e: Execution) => void
}) {
  const contractLabel = `${group.symbol} ${group.expiry} ${group.strike} ${group.option_right.toUpperCase()}`
  return (
    <>
      <TableRow
        className="text-xs cursor-pointer hover:bg-muted/50"
        onClick={onToggle}
      >
        <TableCell className="py-1 px-2">
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </TableCell>
        <TableCell className="py-1 font-mono">
          {contractLabel}
          {expired && <Badge variant="destructive" className="ml-2 text-[10px] px-1 py-0">Expired</Badge>}
        </TableCell>
        {!showNetQty && <TableCell className="py-1 text-right font-mono">{formatPrice(group.buy_avg_price)}</TableCell>}
        {!showNetQty && <TableCell className="py-1 text-right font-mono">{formatPrice(group.sell_avg_price)}</TableCell>}
        {showNetQty && <TableCell className="py-1 text-right font-mono">{group.net_qty.toFixed(1)}</TableCell>}
        <TableCell className="py-1 text-right font-mono">{group.buy_volume + group.sell_volume}</TableCell>
        <TableCell className={cn('py-1 text-right font-mono', group.realized_pnl >= 0 ? 'text-green-600' : 'text-red-500')}>
          {formatCurrency(group.realized_pnl)}
        </TableCell>
        <TableCell className="py-1 text-right">{group.trades.length}</TableCell>
      </TableRow>
      {expanded && group.trades.map((t) => (
        <TableRow key={t.account_executions_id ?? `${t.time}-${t.price}`} className="text-xs bg-muted/30">
          <TableCell />
          <TableCell className="py-0.5 pl-6 font-mono text-muted-foreground">
            {executionDateStr(t)} · {t.side} · {formatPrice(t.price)} × {Math.abs(t.quantity ?? t.qty)}
          </TableCell>
          <TableCell colSpan={showNetQty ? 3 : 4} className="py-0.5 text-right">
            <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1" onClick={(ev) => { ev.stopPropagation(); onEdit(t) }}>
              Edit
            </Button>
            <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1 text-red-500" onClick={(ev) => { ev.stopPropagation(); onDelete(t) }}>
              Del
            </Button>
          </TableCell>
          <TableCell />
        </TableRow>
      ))}
    </>
  )
}

function StkTabContent({
  executions,
  page,
  setPage,
  onEdit,
  onDelete,
}: {
  executions: Execution[]
  page: number
  setPage: (p: number) => void
  onEdit: (e: Execution) => void
  onDelete: (e: Execution) => void
}) {
  const totalPages = Math.max(1, Math.ceil(executions.length / PAGE_SIZE))
  const pageExecs = executions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className="space-y-2">
      <div className="rounded border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="text-xs">
              <TableHead className="h-7">Date</TableHead>
              <TableHead className="h-7">Symbol</TableHead>
              <TableHead className="h-7">Account</TableHead>
              <TableHead className="h-7">Side</TableHead>
              <TableHead className="h-7 text-right">Qty</TableHead>
              <TableHead className="h-7 text-right">Price</TableHead>
              <TableHead className="h-7 text-right">Notional</TableHead>
              <TableHead className="h-7 text-right">Realized PnL</TableHead>
              <TableHead className="h-7">Source</TableHead>
              <TableHead className="h-7 w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageExecs.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-xs text-muted-foreground py-6">
                  No executions found.
                </TableCell>
              </TableRow>
            )}
            {pageExecs.map((e) => (
              <TableRow key={e.account_executions_id ?? `${e.time}-${e.symbol}`} className="text-xs">
                <TableCell className="py-1 font-mono">{executionDateStr(e)}</TableCell>
                <TableCell className="py-1 font-medium">{e.symbol}</TableCell>
                <TableCell className="py-1 text-muted-foreground">{e.account_id}</TableCell>
                <TableCell className="py-1">
                  <Badge variant={e.side === 'Buy' ? 'default' : 'secondary'} className="text-[10px] px-1 py-0">
                    {e.side}
                  </Badge>
                </TableCell>
                <TableCell className="py-1 text-right font-mono">{Math.abs(e.qty)}</TableCell>
                <TableCell className="py-1 text-right font-mono">{formatPrice(e.price)}</TableCell>
                <TableCell className="py-1 text-right font-mono">{formatCurrency(Math.abs(e.qty * e.price))}</TableCell>
                <TableCell className={cn('py-1 text-right font-mono', (e.realized_pnl ?? 0) >= 0 ? 'text-green-600' : 'text-red-500')}>
                  {e.realized_pnl != null ? formatCurrency(e.realized_pnl) : '—'}
                </TableCell>
                <TableCell className="py-1 text-muted-foreground">{e.source ?? '—'}</TableCell>
                <TableCell className="py-1">
                  <div className="flex gap-0.5">
                    <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1" onClick={() => onEdit(e)}>Edit</Button>
                    <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1 text-red-500" onClick={() => onDelete(e)}>Del</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{executions.length} executions</span>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" className="h-6 text-xs" disabled={page === 0} onClick={() => setPage(page - 1)}>
              Prev
            </Button>
            <span className="px-2 leading-6">{page + 1} / {totalPages}</span>
            <Button size="sm" variant="outline" className="h-6 text-xs" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function StrategyTabContent({
  groups,
  opportunitiesMap,
  expandedGroups,
  toggleGroup,
}: {
  groups: Map<number | null, Execution[]>
  opportunitiesMap: Map<number, StrategyOpportunity>
  expandedGroups: Set<string>
  toggleGroup: (k: string) => void
}) {
  const entries = useMemo(() => {
    const arr = Array.from(groups.entries())
    arr.sort(([a], [b]) => (b ?? 0) - (a ?? 0))
    return arr
  }, [groups])

  return (
    <div className="space-y-3">
      {entries.map(([oid, execs]) => {
        const opp = oid != null ? opportunitiesMap.get(oid) : null
        const name = opp?.name ?? execs[0]?.strategy_opportunity_name ?? (oid != null ? `Opportunity #${oid}` : 'Unassigned')
        const structure = opp?.structure_name ?? '—'
        const optGrps = buildOptExecutionGroups(execs)
        const closed = optGrps.filter((g) => g.status === 'realized')
        const open = optGrps.filter((g) => g.status === 'unrealized')
        const key = `strat-${oid ?? 'null'}`
        const expanded = expandedGroups.has(key)

        return (
          <div key={key} className="rounded border">
            <div
              className="flex items-center gap-2 p-2 cursor-pointer hover:bg-muted/50"
              onClick={() => toggleGroup(key)}
            >
              {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              <span className="text-sm font-medium">{name}</span>
              <Badge variant="outline" className="text-[10px]">{structure}</Badge>
              <span className="text-xs text-muted-foreground ml-auto">
                {closed.length} closed · {open.length} open · {execs.length} trades
              </span>
            </div>
            {expanded && closed.length > 0 && (
              <div className="px-2 pb-2">
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs">
                      <TableHead className="h-6">Contract</TableHead>
                      <TableHead className="h-6 text-right">Buy Avg</TableHead>
                      <TableHead className="h-6 text-right">Sell Avg</TableHead>
                      <TableHead className="h-6 text-right">Qty</TableHead>
                      <TableHead className="h-6 text-right">Realized PnL</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {closed.map((g) => (
                      <TableRow key={g.contract_key} className="text-xs">
                        <TableCell className="py-0.5 font-mono">
                          {g.symbol} {g.expiry} {g.strike} {g.option_right.toUpperCase()}
                        </TableCell>
                        <TableCell className="py-0.5 text-right font-mono">{formatPrice(g.buy_avg_price)}</TableCell>
                        <TableCell className="py-0.5 text-right font-mono">{formatPrice(g.sell_avg_price)}</TableCell>
                        <TableCell className="py-0.5 text-right font-mono">{g.buy_volume + g.sell_volume}</TableCell>
                        <TableCell className={cn('py-0.5 text-right font-mono', g.realized_pnl >= 0 ? 'text-green-600' : 'text-red-500')}>
                          {formatCurrency(g.realized_pnl)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )
      })}
      {entries.length === 0 && (
        <p className="text-xs text-muted-foreground">No executions found.</p>
      )}
    </div>
  )
}

function InstanceTabContent({
  withInst,
  noInst,
  opportunitiesMap,
  expandedGroups,
  toggleGroup,
}: {
  withInst: Map<number, Execution[]>
  noInst: Execution[]
  opportunitiesMap: Map<number, StrategyOpportunity>
  expandedGroups: Set<string>
  toggleGroup: (k: string) => void
}) {
  const instEntries = useMemo(() => {
    const arr = Array.from(withInst.entries())
    arr.sort(([a], [b]) => b - a)
    return arr
  }, [withInst])

  return (
    <div className="space-y-4">
      <section>
        <h3 className="text-sm font-medium mb-2">With Instance ({instEntries.length})</h3>
        <div className="space-y-2">
          {instEntries.map(([iid, execs]) => {
            const first = execs[0]
            const label = first?.strategy_instance_label ?? `Instance #${iid}`
            const oppName = first?.strategy_opportunity_name
              ?? (first?.strategy_opportunity_id != null ? opportunitiesMap.get(first.strategy_opportunity_id)?.name : null)
              ?? '—'
            const key = `inst-${iid}`
            const expanded = expandedGroups.has(key)
            const optGrps = buildOptExecutionGroups(execs)
            const closed = optGrps.filter((g) => g.status === 'realized')

            return (
              <div key={key} className="rounded border">
                <div
                  className="flex items-center gap-2 p-2 cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleGroup(key)}
                >
                  {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  <span className="text-sm font-medium">{label}</span>
                  <span className="text-xs text-muted-foreground">({oppName})</span>
                  <span className="text-xs text-muted-foreground ml-auto">{execs.length} trades</span>
                </div>
                {expanded && closed.length > 0 && (
                  <div className="px-2 pb-2">
                    <Table>
                      <TableHeader>
                        <TableRow className="text-xs">
                          <TableHead className="h-6">Contract</TableHead>
                          <TableHead className="h-6 text-right">Realized PnL</TableHead>
                          <TableHead className="h-6 text-right">Trades</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {closed.map((g) => (
                          <TableRow key={g.contract_key} className="text-xs">
                            <TableCell className="py-0.5 font-mono">
                              {g.symbol} {g.expiry} {g.strike} {g.option_right.toUpperCase()}
                            </TableCell>
                            <TableCell className={cn('py-0.5 text-right font-mono', g.realized_pnl >= 0 ? 'text-green-600' : 'text-red-500')}>
                              {formatCurrency(g.realized_pnl)}
                            </TableCell>
                            <TableCell className="py-0.5 text-right">{g.trades.length}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )
          })}
          {instEntries.length === 0 && (
            <p className="text-xs text-muted-foreground">No instance-linked executions.</p>
          )}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-medium mb-2">No Instance ({noInst.length})</h3>
        {noInst.length === 0 ? (
          <p className="text-xs text-muted-foreground">All executions have an instance.</p>
        ) : (
          <div className="rounded border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="h-7">Date</TableHead>
                  <TableHead className="h-7">Symbol</TableHead>
                  <TableHead className="h-7">Type</TableHead>
                  <TableHead className="h-7">Side</TableHead>
                  <TableHead className="h-7 text-right">Qty</TableHead>
                  <TableHead className="h-7 text-right">Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {noInst.slice(0, 100).map((e) => (
                  <TableRow key={e.account_executions_id ?? `${e.time}-${e.symbol}`} className="text-xs">
                    <TableCell className="py-1 font-mono">{executionDateStr(e)}</TableCell>
                    <TableCell className="py-1 font-medium">{e.symbol}</TableCell>
                    <TableCell className="py-1">{e.sec_type}</TableCell>
                    <TableCell className="py-1">{e.side}</TableCell>
                    <TableCell className="py-1 text-right font-mono">{Math.abs(e.quantity ?? e.qty)}</TableCell>
                    <TableCell className="py-1 text-right font-mono">{formatPrice(e.price)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  )
}
