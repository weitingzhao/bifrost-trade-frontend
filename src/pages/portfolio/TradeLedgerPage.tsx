import { useState, useMemo, useCallback, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { useOpportunities } from '@/hooks/useStrategies'
import { useLedgerExecutions, useLedgerExecutionsBook } from '@/hooks/useLedgerExecutions'
import { deleteExecution, updateExecution } from '@/api/trading'
import { DeleteConfirmDialog } from '@/components/positions/DeleteConfirmDialog'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { ExecutionFormModal } from '@/components/positions/ExecutionFormModal'
import { LinkExecutionModal } from '@/components/positions/LinkExecutionModal'
import { QuickCloseModal } from '@/components/positions/QuickCloseModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  ChevronDown, ChevronRight, RefreshCw,
} from 'lucide-react'
import type { Execution, StrategyOpportunity } from '@/types/positions'
import type { OptionStockLinkSummary } from '@/types/trading'
import {
  LEDGER_SINCE_PRESET_TABS,
  LEDGER_SUMMARY_PERIOD_TABS,
  getSinceTradeDateRange,
  executionMatchesLedgerTradePeriod,
  executionMatchesExpiryYearMonth,
  rollupOptionsFromMonthly,
  rollupStocksFromMonthly,
  formatPeriodLabel,
} from '@/utils/ledger/summaryPeriod'
import type { LedgerSincePreset, LedgerSummaryPeriod } from '@/utils/ledger/summaryPeriod'
import {
  buildOptExecutionGroups,
  isOptionExpired,
} from '@/utils/ledger/optExecutionGroups'
import {
  buildPositionCategoryByAccountContract,
  getStkLedgerBucketForExecution,
  buildStkPositionSnapshotMap,
} from '@/utils/ledger/stkBuckets'
import type { StkLedgerBucket } from '@/utils/ledger/stkBuckets'
import {
  adjustedRealizedPnlForOptGroup,
  executionStrategyInstanceIds,
  sliceExecutionForInstanceOptView,
  expandExecutionRowsForStrategyOptView,
  groupExecutionsByStrategyInstanceId,
  executionStrategyOpportunityKey,
  executionInstanceLabel,
  getInstanceConsistencyState,
} from '@/utils/ledger/ledgerOptHelpers'
import type { InstanceConsistencyState } from '@/utils/ledger/ledgerOptHelpers'
import { fetchOptionStockLinkMapForExecutions } from '@/utils/ledger/fetchOptionStockLinkMap'
import {
  TAB_GROUPS, MONTH_NAMES, fmtCcy, fmtPrice, fmtMdHint, pnlClass, execMonthKey, SortIcon,
} from '@/pages/portfolio/ledger/types'
import type { MainTab, OptSortCol, StkSortCol, GroupBy, OptSubTab, InstanceSubTab, OptInstanceFilter } from '@/pages/portfolio/ledger/types'
import { SummaryTable } from '@/pages/portfolio/ledger/SummaryTable'
import { OptionsTabContent } from '@/pages/portfolio/ledger/OptionsTabContent'
import { StkTabContent } from '@/pages/portfolio/ledger/StkTabContent'
import { StrategyTabContent } from '@/pages/portfolio/ledger/StrategyTabContent'
import { InstanceTabContent } from '@/pages/portfolio/ledger/InstanceTabContent'

function getAccounts(status: import('@/types/monitor').StatusResponse | null | undefined): string[] {
  const a: string[] = []
  const host = status?.config?.ib_client?.account?.event_host
  const sec = status?.config?.ib_client?.account?.event_secondary
  if (host) a.push(host)
  if (sec) a.push(sec)
  return a
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function TradeLedgerPage() {
  const { data: status } = useMonitorStatus()
  const { data: oppData } = useOpportunities()
  const queryClient = useQueryClient()

  const { data: canonData, isLoading: canonLoading, isError: canonError, refetch: refetchCanon } = useLedgerExecutions({ limit: 0, enabled: true })
  const { data: bookData, isLoading: bookLoading, isError: bookError, refetch: refetchBook } = useLedgerExecutionsBook({ limit: 0, enabled: true })

  // ── Core filters ────────────────────────────────────────────────────────
  const [sincePreset, setSincePreset] = useState<LedgerSincePreset>('all')
  const [accountFilter, setAccountFilter] = useState('all')
  const [symbolFilter, setSymbolFilter] = useState('')
  const [activeTab, setActiveTab] = useState<MainTab>('options')
  const [summaryPeriod, setSummaryPeriod] = useState<LedgerSummaryPeriod>('month')
  const [summaryOpen, setSummaryOpen] = useState(true)

  // Expiry filter (OPT only, mutually exclusive with sincePreset)
  const [expiryFilterYear, setExpiryFilterYear] = useState('')
  const [expiryFilterMonth, setExpiryFilterMonth] = useState('')

  // Structure / Wishlist symbol filter
  const [filterStructure, setFilterStructure] = useState('')
  const [filterWishlistSymbol, setFilterWishlistSymbol] = useState('')

  // ── Display mode state ──────────────────────────────────────────────────
  const [accordionMode, setAccordionMode] = useState(false)
  const [groupBy, setGroupBy] = useState<GroupBy>('opportunity')
  const [optSubTab, setOptSubTab] = useState<OptSubTab>('contracts')
  const [instanceSubTab, setInstanceSubTab] = useState<InstanceSubTab>('with_instance')
  const [optInstanceFilter, setOptInstanceFilter] = useState<OptInstanceFilter>('all')
  const [stkCategoryTab, setStkCategoryTab] = useState('All')

  // Options display
  const [optRightFilter, setOptRightFilter] = useState<'' | 'C' | 'P'>('')
  const [optSort, setOptSort] = useState<{ col: OptSortCol; dir: 'asc' | 'desc' }>({ col: 'expiry', dir: 'desc' })

  // STK display
  const [stkSort, setStkSort] = useState<{ col: StkSortCol; dir: 'asc' | 'desc' }>({ col: 'trade_date', dir: 'desc' })
  const [groupByPosition, setGroupByPosition] = useState(false)

  // Instance tab filter
  const [instanceContainOpenFilter, setInstanceContainOpenFilter] = useState<'all' | 'yes' | 'no'>('all')

  // Expansion state — shared across opt groups
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  // Strategy outer buckets (when groupBy !== 'opportunity')
  const [outerStrategyExpanded, setOuterStrategyExpanded] = useState<Set<string>>(new Set())
  // Strategy Opportunity expand
  const [strategyOppExpanded, setStrategyOppExpanded] = useState<Set<string>>(new Set())
  const [strategyInstExpanded, setStrategyInstExpanded] = useState<Set<string>>(new Set())
  // Instance outer buckets
  const [outerInstanceExpanded, setOuterInstanceExpanded] = useState<Set<string>>(new Set())

  // Pagination + modals
  const [stkPage, setStkPage] = useState(0)
  const [editExec, setEditExec] = useState<Execution | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Execution | null>(null)
  const [linkStrategyTarget, setLinkStrategyTarget] = useState<Execution | null>(null)
  const [expiredCloseTarget, setExpiredCloseTarget] = useState<Execution | null>(null)
  const [viewLinksTarget, setViewLinksTarget] = useState<{ title: string; oid: number } | null>(null)
  const [syncingId, setSyncingId] = useState<number | null>(null)

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

  // Split open groups: active (not expired) and expired unrealized
  const activeOpenOptGroups = useMemo(() => openOptGroups.filter(g => !isOptionExpired(g.expiry)), [openOptGroups])
  const expiredUnrealizedGroups = useMemo(() => openOptGroups.filter(g => isOptionExpired(g.expiry)), [openOptGroups])
  const allOrphanGroups = useMemo(() => [...activeOpenOptGroups, ...expiredUnrealizedGroups], [activeOpenOptGroups, expiredUnrealizedGroups])

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

  // Options tab attribution filter
  const filteredClosedOptGroups = useMemo(() => {
    if (optInstanceFilter === 'all') return sortedClosedOptGroups
    return sortedClosedOptGroups.filter(g => {
      const state: InstanceConsistencyState = getInstanceConsistencyState(g.trades)
      if (optInstanceFilter === 'has_instance') return state === 'same' || state === 'multiple'
      if (optInstanceFilter === 'no_instance') return state === 'none'
      if (optInstanceFilter === 'mixed') return state === 'mixed'
      return true
    })
  }, [sortedClosedOptGroups, optInstanceFilter])

  const sortedOpenOptGroups = useMemo(() => {
    const list = optRightFilter
      ? allOrphanGroups.filter(g => g.option_right.toUpperCase()[0] === optRightFilter)
      : allOrphanGroups
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
  }, [allOrphanGroups, optSort, optRightFilter])

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

  // STK category tabs
  const stkCategoryOptions = useMemo((): string[] => {
    const bucket = activeTab as StkLedgerBucket
    if (bucket !== 'stocks' && bucket !== 'fixed_income' && bucket !== 'cash_like') return ['All']
    const cats = new Set<string>()
    for (const e of stkByBucket[bucket] ?? []) {
      const c = catMap.get(`${e.account_id}|${e.contract_key?.trim() ?? ''}`) ?? '—'
      if (c !== '—') cats.add(c)
    }
    return ['All', ...Array.from(cats).sort(), 'Uncategorized']
  }, [activeTab, stkByBucket, catMap])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!stkCategoryOptions.includes(stkCategoryTab)) setStkCategoryTab('All')
  }, [stkCategoryOptions, stkCategoryTab])

  const stkExecsForDisplay = useMemo(() => {
    if (stkCategoryTab === 'All') return stkExecsSorted
    if (stkCategoryTab === 'Uncategorized') {
      return stkExecsSorted.filter(e => {
        const c = catMap.get(`${e.account_id}|${e.contract_key?.trim() ?? ''}`) ?? '—'
        return c === '—'
      })
    }
    return stkExecsSorted.filter(e => {
      const c = catMap.get(`${e.account_id}|${e.contract_key?.trim() ?? ''}`) ?? '—'
      return c === stkCategoryTab
    })
  }, [stkExecsSorted, stkCategoryTab, catMap])

  const stkPositionSnapshotMap = useMemo(() => buildStkPositionSnapshotMap(status), [status])

  const stkPositionGroups = useMemo(() => {
    if (!groupByPosition) return null
    const byKey = new Map<string, Execution[]>()
    for (const e of stkExecsForDisplay) {
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
  }, [groupByPosition, stkExecsForDisplay, stkPositionSnapshotMap])

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
        const key = executionStrategyOpportunityKey(row)
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
              ? (instTrades.find(t => executionInstanceLabel(t, instId as number))
                  ? executionInstanceLabel(instTrades[0], instId as number)
                  : `#${instId as number}`)
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
        const symbols = opp?.symbols ?? []
        return { opportunityId: oppId, title, structure, symbols, instanceSubgroups }
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
        .map(([id, trades]) => {
          const label = trades.find(t => executionInstanceLabel(t, id))
            ? executionInstanceLabel(trades[0], id)
            : null
          const oppId = trades.find(t => t.strategy_opportunity_id)?.strategy_opportunity_id ?? null
          const opp = oppId != null ? opportunitiesMap.get(oppId) : null
          return {
            instanceId: id,
            label,
            oppName: trades.find(t => t.strategy_opportunity_name)?.strategy_opportunity_name ?? null,
            structure: opp?.structure_name ?? '—',
            symbols: opp?.symbols ?? [],
            groups: buildOptExecutionGroups(trades),
            trades,
          }
        })
        .sort((a, b) => b.instanceId - a.instanceId),
      noInst,
    }
  }, [optionExecutionsBook, opportunitiesMap])

  const filteredInstanceGroups = useMemo(() => {
    let list = instanceGroupsRaw.withInst
    if (instanceContainOpenFilter === 'yes') list = list.filter(ig => ig.groups.some(g => g.status === 'unrealized'))
    if (instanceContainOpenFilter === 'no') list = list.filter(ig => ig.groups.every(g => g.status === 'realized'))
    if (optRightFilter) list = list.filter(ig => ig.groups.some(g => g.option_right.toUpperCase()[0] === optRightFilter))
    return list
  }, [instanceGroupsRaw, instanceContainOpenFilter, optRightFilter])

  const noInstanceOptGroups = useMemo(
    () => buildOptExecutionGroups(instanceGroupsRaw.noInst),
    [instanceGroupsRaw.noInst],
  )

  // ── Group-by display buckets ─────────────────────────────────────────────
  type StratOppGroupBase = typeof strategyOpportunityGroups[number]
  type InstGroupBase = typeof filteredInstanceGroups[number]

  const strategyDisplayBuckets = useMemo((): { key: string; label: string; groups: StratOppGroupBase[] }[] => {
    if (groupBy === 'opportunity') return [{ key: '_all', label: '', groups: strategyOpportunityGroups }]
    if (groupBy === 'structure') {
      const m = new Map<string, StratOppGroupBase[]>()
      for (const og of strategyOpportunityGroups) {
        const k = og.structure || '—'
        const arr = m.get(k) ?? []; arr.push(og); m.set(k, arr)
      }
      return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b))
        .map(([k, g]) => ({ key: `struct:${k}`, label: k === '—' ? 'Unspecified structure' : k, groups: g }))
    }
    // watchlist_symbol
    const m = new Map<string, StratOppGroupBase[]>()
    for (const og of strategyOpportunityGroups) {
      const syms = og.symbols.length > 0 ? og.symbols : ['—']
      const seen = new Set<string>()
      for (const sym of syms) {
        if (seen.has(sym)) continue; seen.add(sym)
        const arr = m.get(sym) ?? []; arr.push(og); m.set(sym, arr)
      }
    }
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b))
      .map(([k, g]) => ({ key: `sym:${k}`, label: k === '—' ? 'No watchlist symbol' : k, groups: g }))
  }, [groupBy, strategyOpportunityGroups])

  const instanceDisplayBuckets = useMemo((): { key: string; label: string; groups: InstGroupBase[] }[] => {
    if (groupBy === 'opportunity') return [{ key: '_all', label: '', groups: filteredInstanceGroups }]
    if (groupBy === 'structure') {
      const m = new Map<string, InstGroupBase[]>()
      for (const ig of filteredInstanceGroups) {
        const k = ig.structure || '—'
        const arr = m.get(k) ?? []; arr.push(ig); m.set(k, arr)
      }
      return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b))
        .map(([k, g]) => ({ key: `struct:${k}`, label: k === '—' ? 'Unspecified structure' : k, groups: g }))
    }
    const m = new Map<string, InstGroupBase[]>()
    for (const ig of filteredInstanceGroups) {
      const syms = ig.symbols.length > 0 ? ig.symbols : ['—']
      const seen = new Set<string>()
      for (const sym of syms) {
        if (seen.has(sym)) continue; seen.add(sym)
        const arr = m.get(sym) ?? []; arr.push(ig); m.set(sym, arr)
      }
    }
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b))
      .map(([k, g]) => ({ key: `sym:${k}`, label: k === '—' ? 'No watchlist symbol' : k, groups: g }))
  }, [groupBy, filteredInstanceGroups])

  // Auto-expand outer buckets when groupBy changes to non-opportunity mode
  useEffect(() => {
    if (groupBy === 'opportunity') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOuterStrategyExpanded(new Set())
       
      setOuterInstanceExpanded(new Set())
    } else {
       
      setOuterStrategyExpanded(new Set(strategyDisplayBuckets.map(b => b.key)))
       
      setOuterInstanceExpanded(new Set(instanceDisplayBuckets.map(b => b.key)))
    }
  }, [groupBy, strategyDisplayBuckets, instanceDisplayBuckets])

  // Auto-switch instance sub-tab when data changes
  useEffect(() => {
    if (activeTab !== 'instance') return
    const hasWithInst = instanceGroupsRaw.withInst.length > 0
    const hasNoInst = instanceGroupsRaw.noInst.length > 0
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (instanceSubTab === 'with_instance' && !hasWithInst && hasNoInst) setInstanceSubTab('no_instance')
     
    if (instanceSubTab === 'no_instance' && !hasNoInst && hasWithInst) setInstanceSubTab('with_instance')
  }, [activeTab, instanceSubTab, instanceGroupsRaw])

  // ── Tab availability ─────────────────────────────────────────────────────
  const hasOptExecs = optGroups.length > 0
  const hasStkExecs = stkByBucket.stocks.length > 0
  const hasFixedIncomeExecs = stkByBucket.fixed_income.length > 0
  const hasCashLikeExecs = stkByBucket.cash_like.length > 0

  // Auto-switch tab when data availability changes
  useEffect(() => {
    if ((activeTab === 'strategy' || activeTab === 'instance' || activeTab === 'options') && !hasOptExecs) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (hasStkExecs) setActiveTab('stocks')
       
      else if (hasFixedIncomeExecs) setActiveTab('fixed_income')
       
      else if (hasCashLikeExecs) setActiveTab('cash_like')
    }
     
    if (activeTab === 'stocks' && !hasStkExecs && hasOptExecs) setActiveTab('strategy')
     
    if (activeTab === 'fixed_income' && !hasFixedIncomeExecs && hasOptExecs) setActiveTab('strategy')
     
    if (activeTab === 'cash_like' && !hasCashLikeExecs && hasOptExecs) setActiveTab('strategy')
  }, [activeTab, hasOptExecs, hasStkExecs, hasFixedIncomeExecs, hasCashLikeExecs])

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
  function toggleExpanded(key: string, setter: React.Dispatch<React.SetStateAction<Set<string>>>) {
    setter(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        if (accordionMode) next.clear()
        next.add(key)
      }
      return next
    })
  }

  function toggleGroup(key: string) { toggleExpanded(key, setExpandedGroups) }
  function toggleStrategyOpp(oppId: number | 'none') { toggleExpanded(String(oppId), setStrategyOppExpanded) }
  function toggleStrategyInst(oppId: number | 'none', instId: number | 'none') {
    toggleExpanded(`${oppId}::${instId}`, setStrategyInstExpanded)
  }
  function toggleOuterStrategy(key: string) { toggleExpanded(key, setOuterStrategyExpanded) }
  function toggleOuterInstance(key: string) { toggleExpanded(key, setOuterInstanceExpanded) }

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

  async function handleSyncOppositeLeg(ex: Execution, source: { opportunity_id: number; instance_id: number }) {
    const id = ex.account_executions_id
    if (id == null) return
    setSyncingId(id)
    try {
      await updateExecution(id, {
        strategy_opportunity_id: source.opportunity_id,
        strategy_instance_id: source.instance_id,
      })
      queryClient.invalidateQueries({ queryKey: ['trading', 'executions'] })
    } finally {
      setSyncingId(null)
    }
  }

  const isLoading = canonLoading || bookLoading
  const isOptTab = activeTab === 'options' || activeTab === 'strategy' || activeTab === 'instance'
  const isStkTab = activeTab === 'stocks' || activeTab === 'fixed_income' || activeTab === 'cash_like'

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 space-y-3">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">Trade Ledger</h1>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1.5 text-xs text-muted-foreground"
          onClick={() => { void refetchCanon(); void refetchBook() }}
          disabled={isLoading}
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {(canonError || bookError) && (
        <QueryErrorAlert
          error="Failed to load executions — check Trading API connection."
          onRetry={() => { void refetchCanon(); void refetchBook() }}
        />
      )}

      {/* ── Filter bar ── */}
      <div className="border rounded-lg bg-muted/20 p-3 space-y-2">
        {/* Row 1: date presets + account + symbol + structure/wishlist */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {/* Since presets */}
          <div className="flex items-center gap-0.5">
            {LEDGER_SINCE_PRESET_TABS.map(t => (
              <button
                key={t.id}
                className={cn(
                  'h-6 px-2 text-[11px] rounded font-medium transition-colors',
                  sincePreset === t.id && !expiryFilterYear
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                )}
                onClick={() => { setSincePreset(t.id); setExpiryFilterYear(''); setExpiryFilterMonth('') }}
              >
                {t.label}
              </button>
            ))}
            {sincePreset !== 'all' && !expiryFilterYear && (
              <span className="ml-1.5 text-[10px] text-muted-foreground tabular-nums">
                {fmtMdHint(dateRange.start)}–{fmtMdHint(dateRange.end)}
              </span>
            )}
          </div>

          {/* Divider */}
          {accounts.length > 0 && <div className="h-4 w-px bg-border" />}

          {/* Account filter */}
          {accounts.length > 0 && (
            <div className="flex items-center gap-0.5">
              <span className="text-[10px] text-muted-foreground mr-1">Acct:</span>
              <button
                className={cn('h-6 px-2 text-[11px] rounded font-medium transition-colors', accountFilter === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted')}
                onClick={() => setAccountFilter('all')}
              >All</button>
              {accounts.map(a => (
                <button
                  key={a}
                  className={cn('h-6 px-2 text-[11px] rounded font-medium font-mono transition-colors', accountFilter === a ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted')}
                  onClick={() => setAccountFilter(a)}
                >{a}</button>
              ))}
            </div>
          )}

          {/* Symbol search */}
          <div className="h-4 w-px bg-border" />
          <Input
            placeholder="Symbol…"
            value={symbolFilter}
            onChange={e => setSymbolFilter(e.target.value)}
            className="h-6 w-28 text-xs px-2 bg-background"
          />

          {/* Structure / Wishlist */}
          {structureOptions.length > 0 && (
            <select
              className="h-6 text-xs rounded border border-input bg-background px-1.5 focus:outline-none max-w-[140px]"
              value={filterStructure}
              onChange={e => { setFilterStructure(e.target.value); setFilterWishlistSymbol('') }}
            >
              <option value="">All structures</option>
              {structureOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          {wishlistSymbolOptions.length > 0 && (
            <select
              className="h-6 text-xs rounded border border-input bg-background px-1.5 focus:outline-none"
              value={filterWishlistSymbol}
              onChange={e => setFilterWishlistSymbol(e.target.value)}
            >
              <option value="">All symbols</option>
              {wishlistSymbolOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          {(filterStructure || filterWishlistSymbol) && (
            <button className="h-6 px-1.5 text-[11px] rounded text-muted-foreground hover:text-foreground hover:bg-muted" onClick={() => { setFilterStructure(''); setFilterWishlistSymbol('') }}>
              Clear
            </button>
          )}

          {/* Accordion/Multi toggle — far right */}
          <div className="flex items-center gap-0.5 ml-auto">
            <span className="text-[10px] text-muted-foreground mr-1">Detail:</span>
            {(['accordion', 'multi'] as const).map(v => (
              <button
                key={v}
                className={cn('h-6 px-2 text-[11px] rounded font-medium transition-colors', (accordionMode ? 'accordion' : 'multi') === v ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-muted')}
                onClick={() => setAccordionMode(v === 'accordion')}
              >{v === 'accordion' ? 'Accordion' : 'Multi'}</button>
            ))}
          </div>
        </div>

        {/* Row 2: OPT expiry + right filter */}
        {isOptTab && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">Expiry:</span>
            <select
              className="h-6 text-xs rounded border border-input bg-background px-1.5 focus:outline-none"
              value={expiryFilterYear}
              onChange={e => { setExpiryFilterYear(e.target.value); setExpiryFilterMonth('') }}
            >
              <option value="">All years</option>
              {expiryYearOptions.map(y => <option key={y} value={String(y)}>{y}</option>)}
            </select>
            <select
              className="h-6 text-xs rounded border border-input bg-background px-1.5 focus:outline-none disabled:opacity-40"
              value={expiryFilterMonth}
              disabled={!expiryFilterYear}
              onChange={e => setExpiryFilterMonth(e.target.value)}
            >
              <option value="">All months</option>
              {expiryMonthOptions.map(m => (
                <option key={m} value={String(m).padStart(2, '0')}>{MONTH_NAMES[m - 1]}</option>
              ))}
            </select>
            {expiryFilterYear && (
              <button className="h-6 px-1.5 text-[11px] rounded text-muted-foreground hover:text-foreground hover:bg-muted" onClick={() => { setExpiryFilterYear(''); setExpiryFilterMonth('') }}>Clear</button>
            )}
            <div className="h-4 w-px bg-border mx-1" />
            <span className="text-[10px] text-muted-foreground">Right:</span>
            {(['', 'C', 'P'] as const).map(r => (
              <button
                key={r}
                className={cn('h-6 px-2 text-[11px] rounded font-medium transition-colors', optRightFilter === r ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted')}
                onClick={() => setOptRightFilter(r)}
              >{r === '' ? 'All' : r === 'C' ? 'Call' : 'Put'}</button>
            ))}
          </div>
        )}

        {/* Row 2: STK controls */}
        {isStkTab && (
          <div className="flex items-center gap-2">
            <button
              className={cn('h-6 px-2 text-[11px] rounded font-medium transition-colors', groupByPosition ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted')}
              onClick={() => setGroupByPosition(v => !v)}
            >By Position</button>
          </div>
        )}
      </div>

      {/* ── Tab bar ── */}
      <div className="flex items-end gap-0 border-b">
        {TAB_GROUPS.map((group, gi) => (
          <div key={group.label} className={cn('flex items-end gap-0', gi > 0 && 'ml-4')}>
            <span className="text-[10px] text-muted-foreground px-2 pb-1.5 self-end">{group.label}</span>
            {group.tabs.map(t => {
              const isDisabled =
                ((t.id === 'strategy' || t.id === 'instance' || t.id === 'options') && !hasOptExecs) ||
                (t.id === 'stocks' && !hasStkExecs) ||
                (t.id === 'fixed_income' && !hasFixedIncomeExecs) ||
                (t.id === 'cash_like' && !hasCashLikeExecs)
              const isActive = activeTab === t.id
              return (
                <button
                  key={t.id}
                  disabled={isDisabled}
                  onClick={() => { setActiveTab(t.id); setStkPage(0) }}
                  className={cn(
                    'px-3 pb-2 pt-1 text-xs font-medium border-b-2 transition-colors',
                    isActive
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                    isDisabled && 'opacity-30 cursor-not-allowed',
                  )}
                >
                  {t.label}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* ── Tab-level filters ── */}
      {activeTab === 'strategy' && hasOptExecs && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">Group:</span>
          {(['opportunity', 'structure', 'watchlist_symbol'] as const).map(v => (
            <Button key={v} size="sm" variant={groupBy === v ? 'secondary' : 'ghost'} className="h-6 text-xs px-2" onClick={() => setGroupBy(v)}>
              {v === 'opportunity' ? 'Opportunity' : v === 'structure' ? 'Structure' : 'Watchlist symbol'}
            </Button>
          ))}
        </div>
      )}

      {activeTab === 'instance' && hasOptExecs && (
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Sub-tab: With / No instance */}
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant={instanceSubTab === 'with_instance' ? 'default' : 'outline'}
              className="h-7 text-xs"
              disabled={instanceGroupsRaw.withInst.length === 0}
              onClick={() => setInstanceSubTab('with_instance')}
            >
              With instance ({instanceGroupsRaw.withInst.length})
            </Button>
            <Button
              size="sm"
              variant={instanceSubTab === 'no_instance' ? 'default' : 'outline'}
              className="h-7 text-xs"
              disabled={instanceGroupsRaw.noInst.length === 0}
              onClick={() => setInstanceSubTab('no_instance')}
            >
              No instance ({noInstanceOptGroups.length})
            </Button>
          </div>
          {instanceSubTab === 'with_instance' && (
            <>
              <span className="text-muted-foreground">Group:</span>
              {(['opportunity', 'structure', 'watchlist_symbol'] as const).map(v => (
                <Button key={v} size="sm" variant={groupBy === v ? 'secondary' : 'ghost'} className="h-6 text-xs px-2" onClick={() => setGroupBy(v)}>
                  {v === 'opportunity' ? 'Opportunity' : v === 'structure' ? 'Structure' : 'Watchlist symbol'}
                </Button>
              ))}
              <span className="text-muted-foreground ml-2">Open positions:</span>
              {(['all', 'yes', 'no'] as const).map(v => (
                <Button key={v} size="sm" variant={instanceContainOpenFilter === v ? 'default' : 'outline'} className="h-7 text-xs"
                  onClick={() => setInstanceContainOpenFilter(v)}>
                  {v === 'all' ? 'All' : v === 'yes' ? 'Has Open' : 'All Closed'}
                </Button>
              ))}
              <span className="text-muted-foreground">{filteredInstanceGroups.length} instances</span>
            </>
          )}
        </div>
      )}

      {activeTab === 'options' && hasOptExecs && (
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Sub-tab: Closed / Open */}
          <div className="flex items-center gap-1">
            <Button size="sm" variant={optSubTab === 'contracts' ? 'default' : 'outline'} className="h-7 text-xs"
              onClick={() => setOptSubTab('contracts')}>
              Closed Option ({filteredClosedOptGroups.length})
            </Button>
            <Button size="sm" variant={optSubTab === 'orphans' ? 'default' : 'outline'} className="h-7 text-xs"
              disabled={allOrphanGroups.length === 0}
              onClick={() => setOptSubTab('orphans')}>
              Open Option ({allOrphanGroups.length})
            </Button>
          </div>
          {optSubTab === 'contracts' && (
            <>
              <span className="text-muted-foreground ml-2">Attribution:</span>
              {(['all', 'has_instance', 'no_instance', 'mixed'] as const).map(v => (
                <Button key={v} size="sm" variant={optInstanceFilter === v ? 'secondary' : 'ghost'} className="h-6 text-xs px-2"
                  onClick={() => setOptInstanceFilter(v)}>
                  {v === 'all' ? 'All' : v === 'has_instance' ? 'Has Instance' : v === 'no_instance' ? 'No Instance' : 'Mixed'}
                </Button>
              ))}
              <span className="text-muted-foreground ml-2">Sort:</span>
              {(['expiry', 'trade_date'] as const).map(col => (
                <Button key={col} size="sm" variant={optSort.col === col ? 'secondary' : 'ghost'} className="h-6 text-xs px-2"
                  onClick={() => toggleOptSort(col)}>
                  {col === 'expiry' ? 'Expiry' : 'Trade Date'} <SortIcon active={optSort.col === col} dir={optSort.dir} />
                </Button>
              ))}
            </>
          )}
        </div>
      )}

      {/* STK category tabs */}
      {isStkTab && stkCategoryOptions.length > 2 && (
        <div className="flex items-center gap-1 flex-wrap">
          {stkCategoryOptions.map(cat => (
            <Button key={cat} size="sm" variant={stkCategoryTab === cat ? 'secondary' : 'ghost'} className="h-6 text-xs px-2"
              onClick={() => { setStkCategoryTab(cat); setStkPage(0) }}>
              {cat}
            </Button>
          ))}
        </div>
      )}

      {/* ── Period summary ── */}
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

      {/* ── Loading ── */}
      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      )}

      {/* ── Tab content ── */}
      {!isLoading && activeTab === 'options' && (
        <OptionsTabContent
          optSubTab={optSubTab}
          closedGroups={filteredClosedOptGroups}
          openActiveGroups={sortedOpenOptGroups.filter(g => !isOptionExpired(g.expiry))}
          openExpiredGroups={sortedOpenOptGroups.filter(g => isOptionExpired(g.expiry))}
          linkByOptionId={linkByOptionId}
          optSort={optSort}
          toggleOptSort={toggleOptSort}
          expandedGroups={expandedGroups}
          toggleGroup={toggleGroup}
          onEdit={setEditExec}
          onDelete={setDeleteTarget}
          onLinkStrategy={setLinkStrategyTarget}
          onViewLinks={setViewLinksTarget}
          onExpiredClose={setExpiredCloseTarget}
          syncingId={syncingId}
          onSyncOpposite={handleSyncOppositeLeg}
        />
      )}

      {!isLoading && isStkTab && (
        <StkTabContent
          executions={stkExecsForDisplay}
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
          displayBuckets={strategyDisplayBuckets}
          groupBy={groupBy}
          linkByOptionId={linkByOptionId}
          outerExpanded={outerStrategyExpanded}
          toggleOuter={toggleOuterStrategy}
          strategyOppExpanded={strategyOppExpanded}
          toggleStrategyOpp={toggleStrategyOpp}
          strategyInstExpanded={strategyInstExpanded}
          toggleStrategyInst={toggleStrategyInst}
          innerExpanded={expandedGroups}
          toggleInner={toggleGroup}
          onEdit={setEditExec}
          onDelete={setDeleteTarget}
          onLinkStrategy={setLinkStrategyTarget}
          onViewLinks={setViewLinksTarget}
          syncingId={syncingId}
          onSyncOpposite={handleSyncOppositeLeg}
        />
      )}

      {!isLoading && activeTab === 'instance' && (
        <InstanceTabContent
          instanceSubTab={instanceSubTab}
          filteredGroups={filteredInstanceGroups}
          noInstGroups={noInstanceOptGroups}
          noInstExecs={instanceGroupsRaw.noInst}
          linkByOptionId={linkByOptionId}
          groupBy={groupBy}
          displayBuckets={instanceDisplayBuckets}
          outerExpanded={outerInstanceExpanded}
          toggleOuter={toggleOuterInstance}
          expandedGroups={expandedGroups}
          toggleGroup={toggleGroup}
          onEdit={setEditExec}
          onDelete={setDeleteTarget}
          onLinkStrategy={setLinkStrategyTarget}
          onViewLinks={setViewLinksTarget}
          syncingId={syncingId}
          onSyncOpposite={handleSyncOppositeLeg}
        />
      )}

      {/* ── Modals ── */}
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
      {linkStrategyTarget && (
        <LinkExecutionModal
          open
          exec={linkStrategyTarget}
          opportunities={oppData?.items ?? []}
          onClose={() => setLinkStrategyTarget(null)}
          onSuccess={() => {
            setLinkStrategyTarget(null)
            queryClient.invalidateQueries({ queryKey: ['trading', 'executions'] })
          }}
        />
      )}
      <QuickCloseModal
        exec={expiredCloseTarget}
        onClose={() => setExpiredCloseTarget(null)}
        onSuccess={() => {
          setExpiredCloseTarget(null)
          queryClient.invalidateQueries({ queryKey: ['trading', 'executions'] })
        }}
      />
      {/* View Option-Stock Links modal */}
      {viewLinksTarget && (() => {
        const summary = linkByOptionId[viewLinksTarget.oid]
        const links = summary?.links ?? []
        return (
          <Dialog open onOpenChange={v => { if (!v) setViewLinksTarget(null) }}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-sm">{viewLinksTarget.title}</DialogTitle>
              </DialogHeader>
              <div className="text-xs space-y-3">
                {links.length === 0
                  ? <p className="text-muted-foreground">No linked stock executions.</p>
                  : (
                    <div className="rounded border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="text-xs">
                            <TableHead className="h-7">Date</TableHead>
                            <TableHead className="h-7">Side</TableHead>
                            <TableHead className="h-7 text-right">Qty</TableHead>
                            <TableHead className="h-7 text-right">Price</TableHead>
                            <TableHead className="h-7 text-right">Slippage</TableHead>
                            <TableHead className="h-7 text-right">Close</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {links.map((lk, i) => {
                            const r = lk as unknown as Record<string, unknown>
                            return (
                              <TableRow key={i} className="text-xs">
                                <TableCell className="py-1 font-mono">{String(r.trade_date ?? r.time ?? '—')}</TableCell>
                                <TableCell className="py-1">{String(r.side ?? '—')}</TableCell>
                                <TableCell className="py-1 text-right font-mono">{String(r.quantity ?? r.qty ?? '—')}</TableCell>
                                <TableCell className="py-1 text-right font-mono">{r.price != null ? fmtPrice(Number(r.price)) : '—'}</TableCell>
                                <TableCell className={cn('py-1 text-right font-mono', pnlClass(Number(r.slippage ?? 0)))}>{r.slippage != null ? fmtCcy(Number(r.slippage)) : '—'}</TableCell>
                                <TableCell className="py-1 text-right font-mono">{r.close_price != null ? fmtPrice(Number(r.close_price)) : '—'}</TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                {summary?.slippage_total != null && (
                  <div className="flex justify-end text-xs font-medium">
                    Total slippage: <span className={cn('ml-2 font-mono', pnlClass(summary.slippage_total))}>{fmtCcy(summary.slippage_total)}</span>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )
      })()}
    </div>
  )
}

