import { useState, useMemo, useCallback, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { useOpportunities } from '@/hooks/useStrategies'
import { useLedgerExecutions, useLedgerExecutionsBook } from '@/hooks/useLedgerExecutions'
import { deleteExecution } from '@/api/trading'
import { DeleteConfirmDialog } from '@/components/positions/DeleteConfirmDialog'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
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
import { ChevronDown, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import type { Execution, StrategyOpportunity } from '@/types/positions'
import type { OptionStockLinkSummary } from '@/types/trading'
import {
  LEDGER_SINCE_PRESET_TABS,
  LEDGER_SUMMARY_PERIOD_TABS,
  getSinceTradeDateRange,
  executionMatchesLedgerTradePeriod,
  executionMatchesExpiryYearMonth,
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
  buildStkPositionSnapshotMap,
} from '@/utils/ledger/stkBuckets'
import type { StkLedgerBucket } from '@/utils/ledger/stkBuckets'
import { executionDateStr } from '@/utils/ledger/performanceUtils'
import {
  adjustedRealizedPnlForOptGroup,
  executionStrategyInstanceIds,
  sliceExecutionForInstanceOptView,
  expandExecutionRowsForStrategyOptView,
  groupExecutionsByStrategyInstanceId,
} from '@/utils/ledger/ledgerOptHelpers'
import { fetchOptionStockLinkMapForExecutions } from '@/utils/ledger/fetchOptionStockLinkMap'

type MainTab = 'strategy' | 'instance' | 'options' | 'stocks' | 'fixed_income' | 'cash_like'
type OptSortCol = 'expiry' | 'trade_date'
type StkSortCol = 'trade_date' | 'realized_pnl'

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

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const PAGE_SIZE = 50

function fmtCcy(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function fmtPrice(n: number | null | undefined): string {
  if (n == null) return '—'
  return n.toFixed(2)
}

function pnlClass(n: number): string {
  return n >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'
}

function getAccounts(status: import('@/types/monitor').StatusResponse | null | undefined): string[] {
  const a: string[] = []
  const host = status?.config?.ib_client?.account?.event_host
  const sec = status?.config?.ib_client?.account?.event_secondary
  if (host) a.push(host)
  if (sec) a.push(sec)
  return a
}

function execMonthKey(e: Execution): string {
  const d = ledgerExecutionDateKey(e.trade_date ?? null, e.time)
  if (!d) return '0000-00'
  return d.slice(0, 7)
}

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return <ArrowUpDown className="inline h-3 w-3 ml-0.5 opacity-40" />
  return dir === 'asc'
    ? <ArrowUp className="inline h-3 w-3 ml-0.5 text-primary" />
    : <ArrowDown className="inline h-3 w-3 ml-0.5 text-primary" />
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function TradeLedgerPage() {
  const { data: status } = useMonitorStatus()
  const { data: oppData } = useOpportunities()
  const queryClient = useQueryClient()

  const { data: canonData, isLoading: canonLoading, isError: canonError, refetch: refetchCanon } = useLedgerExecutions({ limit: 0, enabled: true })
  const { data: bookData, isLoading: bookLoading, isError: bookError, refetch: refetchBook } = useLedgerExecutionsBook({ limit: 0, enabled: true })

  // Core filters
  const [sincePreset, setSincePreset] = useState<LedgerSincePreset>('all')
  const [accountFilter, setAccountFilter] = useState('all')
  const [symbolFilter, setSymbolFilter] = useState('')
  const [activeTab, setActiveTab] = useState<MainTab>('options')
  const [summaryPeriod, setSummaryPeriod] = useState<LedgerSummaryPeriod>('month')
  const [summaryOpen, setSummaryOpen] = useState(true)

  // Expiry filter (OPT only, mutually exclusive with sincePreset)
  const [expiryFilterYear, setExpiryFilterYear] = useState('')
  const [expiryFilterMonth, setExpiryFilterMonth] = useState('')

  // Options display
  const [optRightFilter, setOptRightFilter] = useState<'' | 'C' | 'P'>('')
  const [optSort, setOptSort] = useState<{ col: OptSortCol; dir: 'asc' | 'desc' }>({ col: 'expiry', dir: 'desc' })

  // STK display
  const [stkSort, setStkSort] = useState<{ col: StkSortCol; dir: 'asc' | 'desc' }>({ col: 'trade_date', dir: 'desc' })
  const [groupByPosition, setGroupByPosition] = useState(false)

  // Instance tab filter
  const [instanceContainOpenFilter, setInstanceContainOpenFilter] = useState<'all' | 'yes' | 'no'>('all')

  // Phase 4a: Structure / Wishlist Symbol filter
  const [filterStructure, setFilterStructure] = useState('')
  const [filterWishlistSymbol, setFilterWishlistSymbol] = useState('')

  // Expansion state
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [strategyOppExpanded, setStrategyOppExpanded] = useState<Set<string>>(new Set())
  const [strategyInstExpanded, setStrategyInstExpanded] = useState<Set<string>>(new Set())

  // Pagination + modals
  const [stkPage, setStkPage] = useState(0)
  const [editExec, setEditExec] = useState<Execution | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Execution | null>(null)

  // Option-stock link map (async)
  const [linkByOptionId, setLinkByOptionId] = useState<Record<number, OptionStockLinkSummary>>({})

  // ── Derived config ───────────────────────────────────────────────────────
  const accounts = useMemo(() => getAccounts(status), [status])
  const dateRange = useMemo(() => getSinceTradeDateRange(sincePreset), [sincePreset])
  const catMap = useMemo(() => buildPositionCategoryByAccountContract(status ?? null), [status])

  const opportunitiesMap = useMemo(() => {
    const m = new Map<number, StrategyOpportunity>()
    for (const o of oppData?.items ?? []) m.set(o.strategy_opportunity_id, o)
    return m
  }, [oppData])

  // Phase 4a: allowed opportunity IDs for structure/symbol filter (null = no filter)
  const allowedOpportunityIds = useMemo((): Set<number> | null => {
    if (!filterStructure && !filterWishlistSymbol) return null
    const ids = new Set<number>()
    for (const o of oppData?.items ?? []) {
      if (filterStructure && o.structure_name !== filterStructure) continue
      if (filterWishlistSymbol && !(o.symbols ?? []).includes(filterWishlistSymbol)) continue
      ids.add(o.strategy_opportunity_id)
    }
    return ids
  }, [oppData, filterStructure, filterWishlistSymbol])

  const structureOptions = useMemo((): string[] => {
    const names = new Set<string>()
    for (const o of oppData?.items ?? []) if (o.structure_name) names.add(o.structure_name)
    return Array.from(names).sort()
  }, [oppData])

  const wishlistSymbolOptions = useMemo((): string[] => {
    const syms = new Set<string>()
    for (const o of oppData?.items ?? []) {
      if (filterStructure && o.structure_name !== filterStructure) continue
      for (const s of o.symbols ?? []) syms.add(s)
    }
    return Array.from(syms).sort()
  }, [oppData, filterStructure])

  // Expiry dropdowns derived from raw (unfiltered) book to avoid circular dep
  const expiryYearOptions = useMemo(() => {
    const years = new Set<number>()
    for (const e of bookData?.items ?? []) {
      if ((e.sec_type ?? '').toUpperCase() !== 'OPT') continue
      const y = parseInt((e.expiry ?? '').replace(/-/g, '').slice(0, 4), 10)
      if (y > 2000) years.add(y)
    }
    years.add(new Date().getFullYear())
    return Array.from(years).sort((a, b) => b - a)
  }, [bookData])

  const expiryMonthOptions = useMemo(() => {
    if (!expiryFilterYear) return []
    const months = new Set<number>()
    for (const e of bookData?.items ?? []) {
      if ((e.sec_type ?? '').toUpperCase() !== 'OPT') continue
      const ex = (e.expiry ?? '').replace(/-/g, '')
      if (ex.slice(0, 4) !== expiryFilterYear) continue
      const m = parseInt(ex.slice(4, 6), 10)
      if (m >= 1 && m <= 12) months.add(m)
    }
    return Array.from(months).sort((a, b) => a - b)
  }, [bookData, expiryFilterYear])

  // ── Filtering ────────────────────────────────────────────────────────────
  const filterExec = useCallback((e: Execution): boolean => {
    if (accountFilter !== 'all' && e.account_id !== accountFilter) return false
    if (symbolFilter && !e.symbol.toLowerCase().includes(symbolFilter.toLowerCase())) return false
    if (allowedOpportunityIds !== null) {
      const oppId = e.strategy_opportunity_id
      if (oppId == null || !allowedOpportunityIds.has(oppId)) return false
    }
    const isOpt = (e.sec_type ?? '').toUpperCase() === 'OPT'
    if (isOpt && expiryFilterYear) {
      return executionMatchesExpiryYearMonth(e.expiry, expiryFilterYear, expiryFilterMonth)
    }
    return executionMatchesLedgerTradePeriod(e.trade_date ?? null, e.time, dateRange)
  }, [dateRange, accountFilter, symbolFilter, expiryFilterYear, expiryFilterMonth, allowedOpportunityIds])

  const canonFiltered = useMemo(() => (canonData?.items ?? []).filter(filterExec), [canonData, filterExec])
  const bookFiltered = useMemo(() => (bookData?.items ?? []).filter(filterExec), [bookData, filterExec])

  // Load option-stock link map when filtered executions change
  const bookFilteredKey = useMemo(
    () => bookFiltered.map(e => e.account_executions_id).join(','),
    [bookFiltered],
  )
  useEffect(() => {
    let cancelled = false
    fetchOptionStockLinkMapForExecutions(bookFiltered)
      .then(r => { if (!cancelled) setLinkByOptionId(r) })
      .catch(() => { if (!cancelled) setLinkByOptionId({}) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookFilteredKey])

  // ── OPT groups ───────────────────────────────────────────────────────────
  const optGroups = useMemo(() => buildOptExecutionGroups(bookFiltered), [bookFiltered])
  const closedOptGroups = useMemo(() => optGroups.filter(g => g.status === 'realized'), [optGroups])
  const openOptGroups = useMemo(() => optGroups.filter(g => g.status === 'unrealized'), [optGroups])

  const sortedClosedOptGroups = useMemo(() => {
    const list = optRightFilter
      ? closedOptGroups.filter(g => g.option_right.toUpperCase()[0] === optRightFilter)
      : closedOptGroups
    return [...list].sort((a, b) => {
      if (optSort.col === 'expiry') {
        const ae = (a.expiry ?? '').replace(/-/g, '')
        const be = (b.expiry ?? '').replace(/-/g, '')
        return optSort.dir === 'desc' ? be.localeCompare(ae) : ae.localeCompare(be)
      }
      const at = a.trades[0]?.time ?? 0
      const bt = b.trades[0]?.time ?? 0
      return optSort.dir === 'desc' ? bt - at : at - bt
    })
  }, [closedOptGroups, optSort, optRightFilter])

  const sortedOpenOptGroups = useMemo(() => {
    const list = optRightFilter
      ? openOptGroups.filter(g => g.option_right.toUpperCase()[0] === optRightFilter)
      : openOptGroups
    return [...list].sort((a, b) => {
      if (optSort.col === 'expiry') {
        const ae = (a.expiry ?? '').replace(/-/g, '')
        const be = (b.expiry ?? '').replace(/-/g, '')
        return optSort.dir === 'desc' ? be.localeCompare(ae) : ae.localeCompare(be)
      }
      const at = a.trades[0]?.time ?? 0
      const bt = b.trades[0]?.time ?? 0
      return optSort.dir === 'desc' ? bt - at : at - bt
    })
  }, [openOptGroups, optSort, optRightFilter])

  // ── STK buckets ──────────────────────────────────────────────────────────
  const stkByBucket = useMemo(() => {
    const b: Record<StkLedgerBucket, Execution[]> = { stocks: [], fixed_income: [], cash_like: [] }
    for (const e of canonFiltered) {
      if (e.sec_type !== 'STK') continue
      const bucket = getStkLedgerBucketForExecution(e, catMap)
      if (bucket) b[bucket].push(e)
    }
    return b
  }, [canonFiltered, catMap])

  const stkExecsSorted = useMemo(() => {
    const execs = stkByBucket[activeTab as StkLedgerBucket] ?? []
    return [...execs].sort((a, b) => {
      if (stkSort.col === 'realized_pnl') {
        const pa = a.realized_pnl ?? 0
        const pb = b.realized_pnl ?? 0
        return stkSort.dir === 'desc' ? pb - pa : pa - pb
      }
      const da = a.trade_date ?? ''
      const db = b.trade_date ?? ''
      if (da !== db) return stkSort.dir === 'desc' ? db.localeCompare(da) : da.localeCompare(db)
      return stkSort.dir === 'desc' ? (b.time ?? 0) - (a.time ?? 0) : (a.time ?? 0) - (b.time ?? 0)
    })
  }, [activeTab, stkByBucket, stkSort])

  const stkPositionSnapshotMap = useMemo(() => buildStkPositionSnapshotMap(status), [status])

  const stkPositionGroups = useMemo(() => {
    if (!groupByPosition) return null
    const byKey = new Map<string, Execution[]>()
    for (const e of stkExecsSorted) {
      const key = `${e.account_id}|${e.symbol.toUpperCase()}`
      const arr = byKey.get(key) ?? []
      arr.push(e)
      byKey.set(key, arr)
    }
    return Array.from(byKey.entries()).map(([key, fills]) => {
      const [accountId, symbol] = key.split('|')
      const realized = fills.reduce((s, e) => s + (e.realized_pnl ?? 0), 0)
      const ck = fills[0].contract_key?.trim() ?? `${symbol}|STK|||`
      const snap = stkPositionSnapshotMap.get(`${accountId}|${ck}`)
      const unrealized = snap && Math.abs(snap.position) > 1e-9 && snap.price != null
        ? snap.position * (snap.price - snap.avgCost)
        : null
      return { key, accountId, symbol, fills, realized, unrealized, snap }
    })
  }, [groupByPosition, stkExecsSorted, stkPositionSnapshotMap])

  // ── OPT executions only (for Strategy + Instance tabs) ───────────────────
  const optionExecutionsBook = useMemo(
    () => bookFiltered.filter(e => (e.sec_type ?? '').toUpperCase() === 'OPT'),
    [bookFiltered],
  )

  // ── Strategy two-level groups ────────────────────────────────────────────
  const strategyOpportunityGroups = useMemo(() => {
    const byOpp = new Map<number | 'none', Execution[]>()
    for (const e of optionExecutionsBook) {
      for (const row of expandExecutionRowsForStrategyOptView(e)) {
        const key: number | 'none' = row.strategy_opportunity_id ?? 'none'
        const arr = byOpp.get(key) ?? []
        arr.push(row)
        byOpp.set(key, arr)
      }
    }
    return Array.from(byOpp.entries())
      .map(([oppId, trades]) => {
        const byInst = groupExecutionsByStrategyInstanceId(trades)
        const instanceSubgroups = Array.from(byInst.entries())
          .map(([instId, instTrades]) => {
            const sliced = instId === 'none'
              ? instTrades
              : instTrades.flatMap(t => {
                  const r = sliceExecutionForInstanceOptView(t, instId as number)
                  return r ? [r] : []
                })
            const groups = buildOptExecutionGroups(sliced)
            const label = instId !== 'none'
              ? (instTrades.find(t => t.strategy_instance_label)?.strategy_instance_label ?? `#${instId as number}`)
              : null
            return { instanceId: instId, label, groups }
          })
          .sort((a, b) => {
            if (a.instanceId === 'none') return 1
            if (b.instanceId === 'none') return -1
            return (b.instanceId as number) - (a.instanceId as number)
          })
        const opp = oppId !== 'none' ? opportunitiesMap.get(oppId as number) : null
        const title = trades.find(t => t.strategy_opportunity_name)?.strategy_opportunity_name
          ?? opp?.name ?? (oppId !== 'none' ? `Opportunity #${oppId as number}` : 'No opportunity')
        const structure = opp?.structure_name ?? '—'
        return { opportunityId: oppId, title, structure, instanceSubgroups }
      })
      .sort((a, b) => {
        if (a.opportunityId === 'none') return 1
        if (b.opportunityId === 'none') return -1
        return (b.opportunityId as number) - (a.opportunityId as number)
      })
  }, [optionExecutionsBook, opportunitiesMap])

  // ── Instance groups ──────────────────────────────────────────────────────
  const instanceGroupsRaw = useMemo(() => {
    const byId = new Map<number, Execution[]>()
    const noInst: Execution[] = []
    for (const e of optionExecutionsBook) {
      const ids = executionStrategyInstanceIds(e)
      if (ids.length === 0) {
        noInst.push(e)
      } else {
        for (const id of ids) {
          const arr = byId.get(id) ?? []
          const sliced = sliceExecutionForInstanceOptView(e, id)
          if (sliced) arr.push(sliced)
          byId.set(id, arr)
        }
      }
    }
    return {
      withInst: Array.from(byId.entries())
        .map(([id, trades]) => ({
          instanceId: id,
          label: trades.find(t => t.strategy_instance_label)?.strategy_instance_label ?? null,
          oppName: trades.find(t => t.strategy_opportunity_name)?.strategy_opportunity_name ?? null,
          groups: buildOptExecutionGroups(trades),
          trades,
        }))
        .sort((a, b) => b.instanceId - a.instanceId),
      noInst,
    }
  }, [optionExecutionsBook])

  const filteredInstanceGroups = useMemo(() => {
    let list = instanceGroupsRaw.withInst
    if (instanceContainOpenFilter === 'yes') list = list.filter(ig => ig.groups.some(g => g.status === 'unrealized'))
    if (instanceContainOpenFilter === 'no') list = list.filter(ig => ig.groups.every(g => g.status === 'realized'))
    if (optRightFilter) list = list.filter(ig => ig.groups.some(g => g.option_right.toUpperCase()[0] === optRightFilter))
    return list
  }, [instanceGroupsRaw, instanceContainOpenFilter, optRightFilter])

  // ── Period summaries ─────────────────────────────────────────────────────
  const optionSummaryRows = useMemo(() => {
    const monthly = new Map<string, { count: number; realizedPnl: number }>()
    for (const g of closedOptGroups) {
      const mk = g.trades.length > 0 ? execMonthKey(g.trades[0]) : '0000-00'
      const prev = monthly.get(mk) ?? { count: 0, realizedPnl: 0 }
      prev.count += 1
      prev.realizedPnl += adjustedRealizedPnlForOptGroup(g, linkByOptionId)
      monthly.set(mk, prev)
    }
    return rollupOptionsFromMonthly(Array.from(monthly.entries()), summaryPeriod)
  }, [closedOptGroups, summaryPeriod, linkByOptionId])

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

  // ── Handlers ─────────────────────────────────────────────────────────────
  function toggleGroup(key: string) {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function toggleStrategyOpp(oppId: number | 'none') {
    setStrategyOppExpanded(prev => {
      const next = new Set(prev)
      const k = String(oppId)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  }

  function toggleStrategyInst(oppId: number | 'none', instId: number | 'none') {
    setStrategyInstExpanded(prev => {
      const next = new Set(prev)
      const k = `${oppId}::${instId}`
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  }

  function toggleOptSort(col: OptSortCol) {
    setOptSort(prev => prev.col === col
      ? { col, dir: prev.dir === 'desc' ? 'asc' : 'desc' }
      : { col, dir: 'desc' })
  }

  function toggleStkSort(col: StkSortCol) {
    setStkSort(prev => prev.col === col
      ? { col, dir: prev.dir === 'desc' ? 'asc' : 'desc' }
      : { col, dir: 'desc' })
  }

  function handleAddJournal(accountId: string, symbol: string) {
    setEditExec({
      account_executions_id: undefined as unknown as number,
      account_id: accountId,
      symbol,
      sec_type: 'STK',
      side: 'Buy',
      qty: 0,
      quantity: 0,
      price: 0,
      time: null,
    } as unknown as Execution)
  }

  async function handleDelete() {
    if (!deleteTarget?.account_executions_id) return
    await deleteExecution(deleteTarget.account_executions_id)
    queryClient.invalidateQueries({ queryKey: ['trading', 'executions'] })
  }

  const isLoading = canonLoading || bookLoading
  const isOptTab = activeTab === 'options' || activeTab === 'strategy' || activeTab === 'instance'
  const isStkTab = activeTab === 'stocks' || activeTab === 'fixed_income' || activeTab === 'cash_like'

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Trade Ledger</h1>

      {(canonError || bookError) && (
        <QueryErrorAlert
          error="Failed to load executions — check Trading API connection."
          onRetry={() => { void refetchCanon(); void refetchBook() }}
        />
      )}

      {/* Filter bar */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          {/* Since presets */}
          <div className="flex items-center gap-1">
            {LEDGER_SINCE_PRESET_TABS.map(t => (
              <Button
                key={t.id}
                size="sm"
                variant={sincePreset === t.id && !expiryFilterYear ? 'default' : 'outline'}
                className="h-7 text-xs"
                onClick={() => { setSincePreset(t.id); setExpiryFilterYear(''); setExpiryFilterMonth('') }}
              >
                {t.label}
              </Button>
            ))}
          </div>

          {/* Account filter */}
          {accounts.length > 0 && (
            <div className="flex items-center gap-1">
              <Button size="sm" variant={accountFilter === 'all' ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => setAccountFilter('all')}>All</Button>
              {accounts.map(a => (
                <Button key={a} size="sm" variant={accountFilter === a ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => setAccountFilter(a)}>{a}</Button>
              ))}
            </div>
          )}

          <Input
            placeholder="Filter symbol…"
            value={symbolFilter}
            onChange={e => setSymbolFilter(e.target.value)}
            className="h-7 w-36 text-xs"
          />

          {/* Structure filter */}
          {structureOptions.length > 0 && (
            <select
              className="h-7 text-xs rounded border border-input bg-background px-2 focus:outline-none max-w-[160px]"
              value={filterStructure}
              onChange={e => { setFilterStructure(e.target.value); setFilterWishlistSymbol('') }}
            >
              <option value="">All structures</option>
              {structureOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}

          {/* Wishlist symbol filter */}
          {wishlistSymbolOptions.length > 0 && (
            <select
              className="h-7 text-xs rounded border border-input bg-background px-2 focus:outline-none"
              value={filterWishlistSymbol}
              onChange={e => setFilterWishlistSymbol(e.target.value)}
            >
              <option value="">All symbols</option>
              {wishlistSymbolOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}

          {(filterStructure || filterWishlistSymbol) && (
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setFilterStructure(''); setFilterWishlistSymbol('') }}>
              Clear
            </Button>
          )}
        </div>

        {/* Expiry filter — only for OPT-related tabs */}
        {isOptTab && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Expiry:</span>
            <select
              className="h-7 text-xs rounded border border-input bg-background px-2 focus:outline-none"
              value={expiryFilterYear}
              onChange={e => {
                setExpiryFilterYear(e.target.value)
                setExpiryFilterMonth('')
              }}
            >
              <option value="">All years</option>
              {expiryYearOptions.map(y => <option key={y} value={String(y)}>{y}</option>)}
            </select>
            <select
              className="h-7 text-xs rounded border border-input bg-background px-2 focus:outline-none disabled:opacity-40"
              value={expiryFilterMonth}
              disabled={!expiryFilterYear}
              onChange={e => setExpiryFilterMonth(e.target.value)}
            >
              <option value="">All months</option>
              {expiryMonthOptions.map(m => (
                <option key={m} value={String(m).padStart(2, '0')}>
                  {MONTH_NAMES[m - 1]}
                </option>
              ))}
            </select>
            {expiryFilterYear && (
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setExpiryFilterYear(''); setExpiryFilterMonth('') }}>
                Clear
              </Button>
            )}

            {/* C/P filter */}
            <span className="ml-3 text-xs text-muted-foreground">Right:</span>
            {(['', 'C', 'P'] as const).map(r => (
              <Button key={r} size="sm" variant={optRightFilter === r ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => setOptRightFilter(r)}>
                {r === '' ? 'All' : r === 'C' ? 'Call' : 'Put'}
              </Button>
            ))}
          </div>
        )}

        {/* STK controls */}
        {isStkTab && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={groupByPosition ? 'default' : 'outline'}
              className="h-7 text-xs"
              onClick={() => setGroupByPosition(v => !v)}
            >
              By Position
            </Button>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-4 border-b pb-1">
        {TAB_GROUPS.map(group => (
          <div key={group.label} className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground mr-1">{group.label}:</span>
            {group.tabs.map(t => (
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

      {/* Period summary */}
      <Collapsible open={summaryOpen} onOpenChange={setSummaryOpen}>
        <div className="flex items-center gap-2">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2">
              {summaryOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <span className="ml-1 text-xs font-medium">Period Summary</span>
            </Button>
          </CollapsibleTrigger>
          <div className="flex gap-1">
            {LEDGER_SUMMARY_PERIOD_TABS.map(p => (
              <Button key={p.id} size="sm" variant={summaryPeriod === p.id ? 'secondary' : 'ghost'} className="h-6 text-xs px-2" onClick={() => setSummaryPeriod(p.id)}>
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
          {isStkTab && (
            <SummaryTable
              rows={stkSummaryRows.map(([k, v]) => ({
                period: formatPeriodLabel(k, summaryPeriod),
                col1Label: 'Trades',
                col1: String(v.count),
                col2Label: 'Notional',
                col2: fmtCcy(v.notional),
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

      {/* Tab content */}
      {!isLoading && activeTab === 'options' && (
        <OptionsTabContent
          closedGroups={sortedClosedOptGroups}
          openGroups={sortedOpenOptGroups}
          linkByOptionId={linkByOptionId}
          optSort={optSort}
          toggleOptSort={toggleOptSort}
          expandedGroups={expandedGroups}
          toggleGroup={toggleGroup}
          onEdit={setEditExec}
          onDelete={setDeleteTarget}
        />
      )}

      {!isLoading && isStkTab && (
        <StkTabContent
          executions={stkExecsSorted}
          positionGroups={stkPositionGroups}
          groupByPosition={groupByPosition}
          stkSort={stkSort}
          toggleStkSort={toggleStkSort}
          page={stkPage}
          setPage={setStkPage}
          onEdit={setEditExec}
          onDelete={setDeleteTarget}
          onAddJournal={handleAddJournal}
        />
      )}

      {!isLoading && activeTab === 'strategy' && (
        <StrategyTabContent
          strategyOpportunityGroups={strategyOpportunityGroups}
          linkByOptionId={linkByOptionId}
          strategyOppExpanded={strategyOppExpanded}
          toggleStrategyOpp={toggleStrategyOpp}
          strategyInstExpanded={strategyInstExpanded}
          toggleStrategyInst={toggleStrategyInst}
        />
      )}

      {!isLoading && activeTab === 'instance' && (
        <InstanceTabContent
          filteredGroups={filteredInstanceGroups}
          noInst={instanceGroupsRaw.noInst}
          linkByOptionId={linkByOptionId}
          instanceContainOpenFilter={instanceContainOpenFilter}
          setInstanceContainOpenFilter={setInstanceContainOpenFilter}
          expandedGroups={expandedGroups}
          toggleGroup={toggleGroup}
          onEdit={setEditExec}
          onDelete={setDeleteTarget}
        />
      )}

      {/* Modals */}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        title="Delete execution"
        message={`Delete execution #${deleteTarget?.account_executions_id ?? ''} (${deleteTarget?.symbol ?? ''} ${deleteTarget?.side ?? ''})?`}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
      {editExec && (
        <ExecutionFormModal
          open
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryTable({ rows }: {
  rows: { period: string; col1Label: string; col1: string; col2Label?: string; col2?: string; pnl: number }[]
}) {
  if (rows.length === 0) return <p className="text-xs text-muted-foreground">No data for this period.</p>
  const hasCol2 = rows.some(r => r.col2Label)
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
          {rows.map(r => (
            <TableRow key={r.period} className="text-xs">
              <TableCell className="py-1">{r.period}</TableCell>
              <TableCell className="py-1">{r.col1}</TableCell>
              {hasCol2 && <TableCell className="py-1">{r.col2 ?? ''}</TableCell>}
              <TableCell className={cn('py-1 text-right font-mono', pnlClass(r.pnl))}>
                {fmtCcy(r.pnl)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

// ── Options tab ───────────────────────────────────────────────────────────────

function OptionsTabContent({
  closedGroups, openGroups, linkByOptionId, optSort, toggleOptSort,
  expandedGroups, toggleGroup, onEdit, onDelete,
}: {
  closedGroups: OptExecutionGroup[]
  openGroups: OptExecutionGroup[]
  linkByOptionId: Record<number, OptionStockLinkSummary>
  optSort: { col: OptSortCol; dir: 'asc' | 'desc' }
  toggleOptSort: (col: OptSortCol) => void
  expandedGroups: Set<string>
  toggleGroup: (k: string) => void
  onEdit: (e: Execution) => void
  onDelete: (e: Execution) => void
}) {
  return (
    <div className="space-y-6">
      {/* Sort controls */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Sort:</span>
        <Button size="sm" variant={optSort.col === 'expiry' ? 'secondary' : 'ghost'} className="h-6 text-xs px-2" onClick={() => toggleOptSort('expiry')}>
          Expiry <SortIcon active={optSort.col === 'expiry'} dir={optSort.dir} />
        </Button>
        <Button size="sm" variant={optSort.col === 'trade_date' ? 'secondary' : 'ghost'} className="h-6 text-xs px-2" onClick={() => toggleOptSort('trade_date')}>
          Trade Date <SortIcon active={optSort.col === 'trade_date'} dir={optSort.dir} />
        </Button>
      </div>

      <section>
        <h3 className="text-sm font-medium mb-2">Closed Contracts ({closedGroups.length})</h3>
        {closedGroups.length === 0
          ? <p className="text-xs text-muted-foreground">No closed option groups.</p>
          : (
            <OptGroupsTable
              groups={closedGroups}
              showNetQty={false}
              linkByOptionId={linkByOptionId}
              expandedGroups={expandedGroups}
              toggleGroup={toggleGroup}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          )}
      </section>

      <section>
        <h3 className="text-sm font-medium mb-2">Open / Orphan Contracts ({openGroups.length})</h3>
        {openGroups.length === 0
          ? <p className="text-xs text-muted-foreground">No open option groups.</p>
          : (
            <OptGroupsTable
              groups={openGroups}
              showNetQty
              linkByOptionId={linkByOptionId}
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
  groups, showNetQty, linkByOptionId, expandedGroups, toggleGroup, onEdit, onDelete, keyPrefix = '',
}: {
  groups: OptExecutionGroup[]
  showNetQty: boolean
  linkByOptionId?: Record<number, OptionStockLinkSummary>
  expandedGroups: Set<string>
  toggleGroup: (k: string) => void
  onEdit?: (e: Execution) => void
  onDelete?: (e: Execution) => void
  keyPrefix?: string
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
            <TableHead className="h-7 text-right">Fills</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map(g => {
            const key = keyPrefix + g.contract_key
            return (
              <OptGroupRow
                key={key}
                group={g}
                expanded={expandedGroups.has(key)}
                expired={isOptionExpired(g.expiry)}
                showNetQty={showNetQty}
                linkByOptionId={linkByOptionId}
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
  group, expanded, expired, showNetQty, linkByOptionId, onToggle, onEdit, onDelete,
}: {
  group: OptExecutionGroup
  expanded: boolean
  expired: boolean
  showNetQty: boolean
  linkByOptionId?: Record<number, OptionStockLinkSummary>
  onToggle: () => void
  onEdit?: (e: Execution) => void
  onDelete?: (e: Execution) => void
}) {
  const adjPnl = linkByOptionId ? adjustedRealizedPnlForOptGroup(group, linkByOptionId) : group.realized_pnl
  const stockAdj = adjPnl - group.realized_pnl
  const hasAdj = Math.abs(stockAdj) > 0.005

  return (
    <>
      <TableRow className="text-xs cursor-pointer hover:bg-muted/50" onClick={onToggle}>
        <TableCell className="py-1 px-2">
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </TableCell>
        <TableCell className="py-1 font-mono">
          {group.symbol} {group.expiry} {group.strike} {group.option_right.toUpperCase()}
          {expired && <Badge variant="destructive" className="ml-2 text-[10px] px-1 py-0">Exp</Badge>}
        </TableCell>
        {!showNetQty && <TableCell className="py-1 text-right font-mono">{fmtPrice(group.buy_avg_price)}</TableCell>}
        {!showNetQty && <TableCell className="py-1 text-right font-mono">{fmtPrice(group.sell_avg_price)}</TableCell>}
        {showNetQty && <TableCell className="py-1 text-right font-mono">{group.net_qty.toFixed(1)}</TableCell>}
        <TableCell className="py-1 text-right font-mono">{group.buy_volume + group.sell_volume}</TableCell>
        <TableCell className={cn('py-1 text-right font-mono', pnlClass(adjPnl))}>
          {fmtCcy(adjPnl)}
          {hasAdj && (
            <span className="ml-1 text-[10px] text-blue-500 dark:text-blue-400">
              {stockAdj >= 0 ? '+' : ''}{fmtCcy(stockAdj)}
            </span>
          )}
        </TableCell>
        <TableCell className="py-1 text-right">{group.trades.length}</TableCell>
      </TableRow>
      {expanded && group.trades.map(t => {
        const oid = t.account_executions_id
        const linkCount = oid != null && linkByOptionId ? (linkByOptionId[oid]?.links?.length ?? 0) : 0
        return (
          <TableRow key={oid ?? `${t.time}-${t.price}`} className="text-xs bg-muted/30">
            <TableCell />
            <TableCell className="py-0.5 pl-6 font-mono text-muted-foreground">
              {executionDateStr(t)} · {t.side} · {fmtPrice(t.price)} × {Math.abs(t.quantity ?? t.qty)}
              {linkCount > 0 && (
                <Badge variant="secondary" className="ml-2 text-[10px] px-1 py-0">L{linkCount}</Badge>
              )}
            </TableCell>
            <TableCell colSpan={showNetQty ? 3 : 4} className="py-0.5 text-right">
              {onEdit && (
                <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1" onClick={ev => { ev.stopPropagation(); onEdit(t) }}>Edit</Button>
              )}
              {onDelete && (
                <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1 text-red-500" onClick={ev => { ev.stopPropagation(); onDelete(t) }}>Del</Button>
              )}
            </TableCell>
            <TableCell />
          </TableRow>
        )
      })}
    </>
  )
}

// ── ExecSourceBadge ───────────────────────────────────────────────────────────

function ExecSourceBadge({ source }: { source?: string | null }) {
  if (!source) return <span className="text-muted-foreground">—</span>
  const s = source.toLowerCase()
  const variant = s === 'manual' ? 'secondary' : s === 'tws' ? 'outline' : s === 'flex' ? 'default' : 'outline'
  return <Badge variant={variant} className="text-[10px] px-1 py-0">{source}</Badge>
}

// ── STK tab ───────────────────────────────────────────────────────────────────

type StkPositionGroup = {
  key: string
  accountId: string
  symbol: string
  fills: Execution[]
  realized: number
  unrealized: number | null
  snap: { position: number; avgCost: number; price: number | null } | undefined
}

function StkTabContent({
  executions, positionGroups, groupByPosition, stkSort, toggleStkSort,
  page, setPage, onEdit, onDelete, onAddJournal,
}: {
  executions: Execution[]
  positionGroups: StkPositionGroup[] | null
  groupByPosition: boolean
  stkSort: { col: StkSortCol; dir: 'asc' | 'desc' }
  toggleStkSort: (col: StkSortCol) => void
  page: number
  setPage: (p: number) => void
  onEdit: (e: Execution) => void
  onDelete: (e: Execution) => void
  onAddJournal: (accountId: string, symbol: string) => void
}) {
  const [posGroupExpanded, setPosGroupExpanded] = useState<Set<string>>(new Set())

  function togglePosGroup(key: string) {
    setPosGroupExpanded(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  if (groupByPosition && positionGroups) {
    return (
      <div className="space-y-2">
        {positionGroups.length === 0 && (
          <p className="text-xs text-muted-foreground">No executions found.</p>
        )}
        {positionGroups.map(pg => {
          const exp = posGroupExpanded.has(pg.key)
          const totalPnl = pg.realized + (pg.unrealized ?? 0)
          return (
            <div key={pg.key} className="rounded border">
              <div
                className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50 text-xs"
                onClick={() => togglePosGroup(pg.key)}
              >
                {exp ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
                <span className="font-medium w-16">{pg.symbol}</span>
                <span className="text-muted-foreground">{pg.accountId}</span>
                <span className="text-muted-foreground ml-2">{pg.fills.length} fills</span>
                {pg.snap && Math.abs(pg.snap.position) > 1e-9 && (
                  <span className="text-muted-foreground ml-2">
                    Pos: {pg.snap.position} @ {fmtPrice(pg.snap.avgCost)}
                  </span>
                )}
                <div className="ml-auto flex items-center gap-3">
                  <span>R: <span className={cn('font-mono', pnlClass(pg.realized))}>{fmtCcy(pg.realized)}</span></span>
                  {pg.unrealized != null && (
                    <span>U: <span className={cn('font-mono', pnlClass(pg.unrealized))}>{fmtCcy(pg.unrealized)}</span></span>
                  )}
                  {pg.unrealized != null && (
                    <span className="font-semibold">T: <span className={cn('font-mono', pnlClass(totalPnl))}>{fmtCcy(totalPnl)}</span></span>
                  )}
                  <Button
                    variant="ghost" size="sm"
                    className="h-5 text-[10px] px-1 text-blue-500 ml-1"
                    onClick={ev => { ev.stopPropagation(); onAddJournal(pg.accountId, pg.symbol) }}
                  >+J</Button>
                </div>
              </div>
              {exp && (
                <div className="border-t">
                  <StkFlatTable executions={pg.fills} stkSort={stkSort} toggleStkSort={toggleStkSort} onEdit={onEdit} onDelete={onDelete} onAddJournal={onAddJournal} compact />
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  const totalPages = Math.max(1, Math.ceil(executions.length / PAGE_SIZE))
  const pageExecs = executions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className="space-y-2">
      <StkFlatTable executions={pageExecs} stkSort={stkSort} toggleStkSort={toggleStkSort} onEdit={onEdit} onDelete={onDelete} onAddJournal={onAddJournal} />
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{executions.length} executions</span>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" className="h-6 text-xs" disabled={page === 0} onClick={() => setPage(page - 1)}>Prev</Button>
            <span className="px-2 leading-6">{page + 1} / {totalPages}</span>
            <Button size="sm" variant="outline" className="h-6 text-xs" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  )
}

function StkFlatTable({
  executions, stkSort, toggleStkSort, onEdit, onDelete, onAddJournal, compact = false,
}: {
  executions: Execution[]
  stkSort: { col: StkSortCol; dir: 'asc' | 'desc' }
  toggleStkSort: (col: StkSortCol) => void
  onEdit: (e: Execution) => void
  onDelete: (e: Execution) => void
  onAddJournal: (accountId: string, symbol: string) => void
  compact?: boolean
}) {
  const rowClass = compact ? 'py-0.5' : 'py-1'
  return (
    <div className={cn('rounded border overflow-hidden', compact && 'rounded-none border-0')}>
      <Table>
        <TableHeader>
          <TableRow className="text-xs">
            <TableHead className="h-7 cursor-pointer select-none" onClick={() => toggleStkSort('trade_date')}>
              Date <SortIcon active={stkSort.col === 'trade_date'} dir={stkSort.dir} />
            </TableHead>
            <TableHead className="h-7">Symbol</TableHead>
            <TableHead className="h-7">Account</TableHead>
            <TableHead className="h-7">Side</TableHead>
            <TableHead className="h-7 text-right">Qty</TableHead>
            <TableHead className="h-7 text-right">Price</TableHead>
            <TableHead className="h-7 text-right">Notional</TableHead>
            <TableHead className="h-7 text-right cursor-pointer select-none" onClick={() => toggleStkSort('realized_pnl')}>
              Realized PnL <SortIcon active={stkSort.col === 'realized_pnl'} dir={stkSort.dir} />
            </TableHead>
            <TableHead className="h-7">Source</TableHead>
            <TableHead className="h-7 w-16" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {executions.length === 0 && (
            <TableRow>
              <TableCell colSpan={10} className="text-center text-xs text-muted-foreground py-6">No executions found.</TableCell>
            </TableRow>
          )}
          {executions.map(e => (
            <TableRow key={e.account_executions_id ?? `${e.time}-${e.symbol}`} className="text-xs">
              <TableCell className={cn(rowClass, 'font-mono')}>{executionDateStr(e)}</TableCell>
              <TableCell className={cn(rowClass, 'font-medium')}>{e.symbol}</TableCell>
              <TableCell className={cn(rowClass, 'text-muted-foreground')}>{e.account_id}</TableCell>
              <TableCell className={rowClass}>
                <Badge variant={e.side === 'Buy' ? 'default' : 'secondary'} className="text-[10px] px-1 py-0">{e.side}</Badge>
              </TableCell>
              <TableCell className={cn(rowClass, 'text-right font-mono')}>{Math.abs(e.qty)}</TableCell>
              <TableCell className={cn(rowClass, 'text-right font-mono')}>{fmtPrice(e.price)}</TableCell>
              <TableCell className={cn(rowClass, 'text-right font-mono')}>{fmtCcy(Math.abs(e.qty * e.price))}</TableCell>
              <TableCell className={cn(rowClass, 'text-right font-mono', pnlClass(e.realized_pnl ?? 0))}>
                {e.realized_pnl != null ? fmtCcy(e.realized_pnl) : '—'}
              </TableCell>
              <TableCell className={rowClass}><ExecSourceBadge source={e.source} /></TableCell>
              <TableCell className={rowClass}>
                <div className="flex gap-0.5">
                  <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1" onClick={() => onEdit(e)}>Edit</Button>
                  <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1 text-red-500" onClick={() => onDelete(e)}>Del</Button>
                  <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1 text-blue-500" onClick={() => onAddJournal(e.account_id, e.symbol)}>+J</Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

// ── Strategy tab (two-level: Opportunity → Instance → Contracts) ──────────────

type StratOppGroup = {
  opportunityId: number | 'none'
  title: string
  structure: string
  instanceSubgroups: {
    instanceId: number | 'none'
    label: string | null
    groups: OptExecutionGroup[]
  }[]
}

function StrategyTabContent({
  strategyOpportunityGroups, linkByOptionId,
  strategyOppExpanded, toggleStrategyOpp,
  strategyInstExpanded, toggleStrategyInst,
}: {
  strategyOpportunityGroups: StratOppGroup[]
  linkByOptionId: Record<number, OptionStockLinkSummary>
  strategyOppExpanded: Set<string>
  toggleStrategyOpp: (oppId: number | 'none') => void
  strategyInstExpanded: Set<string>
  toggleStrategyInst: (oppId: number | 'none', instId: number | 'none') => void
}) {
  const [innerExpanded, setInnerExpanded] = useState<Set<string>>(new Set())
  function toggleInner(key: string) {
    setInnerExpanded(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  if (strategyOpportunityGroups.length === 0) {
    return <p className="text-xs text-muted-foreground">No option executions found.</p>
  }

  return (
    <div className="space-y-2">
      {strategyOpportunityGroups.map(og => {
        const oppKey = String(og.opportunityId)
        const oppExpanded = strategyOppExpanded.has(oppKey)

        // Compute opp-level totals
        let closedCount = 0
        let openCount = 0
        let totalPnl = 0
        for (const sg of og.instanceSubgroups) {
          for (const g of sg.groups) {
            if (g.status === 'realized') {
              closedCount++
              totalPnl += adjustedRealizedPnlForOptGroup(g, linkByOptionId)
            } else {
              openCount++
            }
          }
        }

        return (
          <div key={oppKey} className="rounded border">
            {/* Opportunity header */}
            <div
              className="flex items-center gap-2 p-2 cursor-pointer hover:bg-muted/50"
              onClick={() => toggleStrategyOpp(og.opportunityId)}
            >
              {oppExpanded ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
              <span className="text-sm font-medium truncate">{og.title}</span>
              <Badge variant="outline" className="text-[10px] shrink-0">{og.structure}</Badge>
              <span className="text-xs text-muted-foreground ml-2 shrink-0">
                {og.instanceSubgroups.length} inst · {closedCount} closed · {openCount} open
              </span>
              <span className={cn('ml-auto text-xs font-mono font-semibold shrink-0', pnlClass(totalPnl))}>
                {fmtCcy(totalPnl)}
              </span>
            </div>

            {/* Instance subgroups */}
            {oppExpanded && og.instanceSubgroups.map(sg => {
              const instKey = `${og.opportunityId}::${sg.instanceId}`
              const instExpanded = strategyInstExpanded.has(instKey)
              const closedGroups = sg.groups.filter(g => g.status === 'realized')
              const openCount2 = sg.groups.filter(g => g.status === 'unrealized').length
              const instPnl = closedGroups.reduce((s, g) => s + adjustedRealizedPnlForOptGroup(g, linkByOptionId), 0)

              return (
                <div key={instKey} className="border-t">
                  {/* Instance header */}
                  <div
                    className="flex items-center gap-2 px-4 py-1.5 cursor-pointer hover:bg-muted/30 text-xs"
                    onClick={() => toggleStrategyInst(og.opportunityId, sg.instanceId)}
                  >
                    {instExpanded ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
                    <span className="font-medium">{sg.label ?? 'No instance'}</span>
                    <span className="text-muted-foreground ml-2">
                      {closedGroups.length} closed · {openCount2} open
                    </span>
                    <span className={cn('ml-auto font-mono', pnlClass(instPnl))}>{fmtCcy(instPnl)}</span>
                  </div>

                  {/* Contract groups table */}
                  {instExpanded && closedGroups.length > 0 && (
                    <div className="px-4 pb-2">
                      <OptGroupsTable
                        groups={closedGroups}
                        showNetQty={false}
                        linkByOptionId={linkByOptionId}
                        expandedGroups={innerExpanded}
                        toggleGroup={toggleInner}
                        keyPrefix={`${instKey}-`}
                      />
                    </div>
                  )}
                  {instExpanded && closedGroups.length === 0 && (
                    <p className="text-xs text-muted-foreground px-8 pb-2">No closed contracts in this instance.</p>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

// ── Instance tab ──────────────────────────────────────────────────────────────

type InstGroup = {
  instanceId: number
  label: string | null
  oppName: string | null
  groups: OptExecutionGroup[]
  trades: Execution[]
}

function InstanceTabContent({
  filteredGroups, noInst, linkByOptionId,
  instanceContainOpenFilter, setInstanceContainOpenFilter,
  expandedGroups, toggleGroup, onEdit, onDelete,
}: {
  filteredGroups: InstGroup[]
  noInst: Execution[]
  linkByOptionId: Record<number, OptionStockLinkSummary>
  instanceContainOpenFilter: 'all' | 'yes' | 'no'
  setInstanceContainOpenFilter: (v: 'all' | 'yes' | 'no') => void
  expandedGroups: Set<string>
  toggleGroup: (k: string) => void
  onEdit: (e: Execution) => void
  onDelete: (e: Execution) => void
}) {
  const [innerExpanded, setInnerExpanded] = useState<Set<string>>(new Set())
  function toggleInner(key: string) {
    setInnerExpanded(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="space-y-4">
      {/* Filter pills */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Open positions:</span>
        {(['all', 'yes', 'no'] as const).map(v => (
          <Button
            key={v}
            size="sm"
            variant={instanceContainOpenFilter === v ? 'default' : 'outline'}
            className="h-7 text-xs"
            onClick={() => setInstanceContainOpenFilter(v)}
          >
            {v === 'all' ? 'All' : v === 'yes' ? 'Has Open' : 'All Closed'}
          </Button>
        ))}
        <span className="text-xs text-muted-foreground ml-2">{filteredGroups.length} instances</span>
      </div>

      {/* Instance list */}
      <section>
        <div className="space-y-2">
          {filteredGroups.map(ig => {
            const key = `inst-${ig.instanceId}`
            const expanded = expandedGroups.has(key)
            const closedGroups = ig.groups.filter(g => g.status === 'realized')
            const openGroups = ig.groups.filter(g => g.status === 'unrealized')
            const instPnl = closedGroups.reduce((s, g) => s + adjustedRealizedPnlForOptGroup(g, linkByOptionId), 0)

            return (
              <div key={key} className="rounded border">
                <div
                  className="flex items-center gap-2 p-2 cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleGroup(key)}
                >
                  {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  <span className="text-sm font-medium">{ig.label ?? `Instance #${ig.instanceId}`}</span>
                  {ig.oppName && <span className="text-xs text-muted-foreground">({ig.oppName})</span>}
                  <span className="text-xs text-muted-foreground ml-2">
                    {closedGroups.length} closed · {openGroups.length} open
                  </span>
                  <span className={cn('ml-auto text-xs font-mono', pnlClass(instPnl))}>{fmtCcy(instPnl)}</span>
                </div>

                {expanded && (
                  <div className="border-t px-2 pb-2 space-y-2">
                    {closedGroups.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mt-2 mb-1">Closed ({closedGroups.length})</p>
                        <OptGroupsTable
                          groups={closedGroups}
                          showNetQty={false}
                          linkByOptionId={linkByOptionId}
                          expandedGroups={innerExpanded}
                          toggleGroup={toggleInner}
                          keyPrefix={`${key}-c-`}
                        />
                      </div>
                    )}
                    {openGroups.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mt-2 mb-1">Open ({openGroups.length})</p>
                        <OptGroupsTable
                          groups={openGroups}
                          showNetQty
                          linkByOptionId={linkByOptionId}
                          expandedGroups={innerExpanded}
                          toggleGroup={toggleInner}
                          keyPrefix={`${key}-o-`}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          {filteredGroups.length === 0 && (
            <p className="text-xs text-muted-foreground">No instances match the current filter.</p>
          )}
        </div>
      </section>

      {/* No-instance executions */}
      {noInst.length > 0 && (
        <section>
          <h3 className="text-sm font-medium mb-2">No Instance ({noInst.length})</h3>
          <div className="rounded border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="h-7">Date</TableHead>
                  <TableHead className="h-7">Symbol</TableHead>
                  <TableHead className="h-7">Side</TableHead>
                  <TableHead className="h-7 text-right">Qty</TableHead>
                  <TableHead className="h-7 text-right">Price</TableHead>
                  <TableHead className="h-7 text-right">PnL</TableHead>
                  <TableHead className="h-7 w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {noInst.slice(0, 100).map(e => (
                  <TableRow key={e.account_executions_id ?? `${e.time}-${e.symbol}`} className="text-xs">
                    <TableCell className="py-1 font-mono">{executionDateStr(e)}</TableCell>
                    <TableCell className="py-1 font-medium">{e.symbol}</TableCell>
                    <TableCell className="py-1">{e.side}</TableCell>
                    <TableCell className="py-1 text-right font-mono">{Math.abs(e.quantity ?? e.qty)}</TableCell>
                    <TableCell className="py-1 text-right font-mono">{fmtPrice(e.price)}</TableCell>
                    <TableCell className={cn('py-1 text-right font-mono', pnlClass(e.realized_pnl ?? 0))}>
                      {e.realized_pnl != null ? fmtCcy(e.realized_pnl) : '—'}
                    </TableCell>
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
        </section>
      )}
    </div>
  )
}
