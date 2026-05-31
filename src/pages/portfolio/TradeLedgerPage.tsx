import { useState, useMemo, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { useOpportunities } from '@/hooks/useStrategies'
import { useLedgerExecutions, useLedgerExecutionsBook } from '@/hooks/useLedgerExecutions'
import { useLedgerOptionStockLinks } from '@/hooks/useLedgerOptionStockLinks'
import { useLedgerUiSync } from '@/hooks/useLedgerUiSync'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { deleteExecution, updateExecution } from '@/api/trading'
import { PageHeader, PageShell } from '@/components/layout'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RefreshCw, Plus } from 'lucide-react'
import type { Execution, StrategyOpportunity } from '@/types/positions'
import {
  LEDGER_SINCE_PRESET_TABS,
  getSinceTradeDateRange,
  executionMatchesLedgerTradePeriod,
  executionMatchesExpiryYearMonth,
  shouldApplySinceTradeFilter,
} from '@/utils/ledger/summaryPeriod'
import {
  buildOptionsSummaryByMonth,
  buildStocksSummaryByMonth,
  closedGroupsForLedgerSummary,
} from '@/utils/ledger/ledgerSummaryGroups'
import type { LedgerSincePreset, LedgerSummaryPeriod } from '@/utils/ledger/summaryPeriod'
import {
  buildOptExecutionGroups,
  compareOptExecutionGroups,
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
import { LedgerTabToolbar } from '@/pages/portfolio/ledger/LedgerTabToolbar'
import { TradeLedgerModals } from '@/pages/portfolio/ledger/TradeLedgerModals'
import { LedgerFilterBar } from '@/pages/portfolio/ledger/LedgerFilterBar'
import { LedgerSummarySection } from '@/pages/portfolio/ledger/LedgerSummarySection'
import { getLedgerAccountTabs, getLedgerAccountIds } from '@/pages/portfolio/ledger/ledgerAccountTabs'
import styles from '@/pages/portfolio/ledger/TradeLedgerPage.module.css'
import type { MainTab, OptSortCol, StkSortCol, GroupBy, OptSubTab, InstanceSubTab, OptInstanceFilter } from '@/pages/portfolio/ledger/ledgerTypes'
import { OptionsTabContent } from '@/pages/portfolio/ledger/OptionsTabContent'
import { StkTabContent } from '@/pages/portfolio/ledger/StkTabContent'
import { StrategyTabContent } from '@/pages/portfolio/ledger/StrategyTabContent'
import { InstanceTabContent } from '@/pages/portfolio/ledger/InstanceTabContent'

const LEDGER_HELP =
  'Trade ledger is the workspace for open and closed trades, Flex/TWS imports, and manual journal entries (journal_closed) for reconciliation. Instance groups option trades by strategy opportunity and instance.'

// ─── Main page ───────────────────────────────────────────────────────────────

export default function TradeLedgerPage() {
  const { data: status } = useMonitorStatus()
  const { data: oppData } = useOpportunities()
  const queryClient = useQueryClient()

  const { data: canonData, isLoading: canonLoading, isError: canonError, refetch: refetchCanon } = useLedgerExecutions({ limit: 0, enabled: true })
  const { data: bookData, isLoading: bookLoading, isError: bookError, refetch: refetchBook } = useLedgerExecutionsBook({ limit: 0, enabled: true })
  const isLoading = canonLoading || bookLoading

  // ── Core filters ────────────────────────────────────────────────────────
  const [sincePreset, setSincePreset] = useState<LedgerSincePreset>('month')
  const [accountFilter, setAccountFilter] = useState('all')
  const [symbolFilter, setSymbolFilter] = useState('')
  const [activeTab, setActiveTab] = useState<MainTab>('strategy')
  const [summaryPeriod, setSummaryPeriod] = useState<LedgerSummaryPeriod>('month')

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
  const [groupByPosition, setGroupByPosition] = useState(true)

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
  const [createSource, setCreateSource] = useState<'manual' | 'journal_closed'>('manual')

  // ── Derived config ───────────────────────────────────────────────────────
  const accountTabs = useMemo(() => getLedgerAccountTabs(status), [status])
  const accounts = useMemo(() => getLedgerAccountIds(status), [status])
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
    if (!shouldApplySinceTradeFilter(sincePreset, expiryFilterYear)) return true
    return executionMatchesLedgerTradePeriod(e.trade_date ?? null, e.time, dateRange)
  }, [dateRange, accountFilter, symbolFilter, expiryFilterYear, expiryFilterMonth, allowedOpportunityIds, sincePreset])

  const canonFiltered = useMemo(() => (canonData?.items ?? []).filter(filterExec), [canonData, filterExec])
  const bookFiltered = useMemo(() => (bookData?.items ?? []).filter(filterExec), [bookData, filterExec])
  const { data: linkByOptionId = {} } = useLedgerOptionStockLinks(bookFiltered)

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
    return [...list].sort((a, b) => compareOptExecutionGroups(a, b, optSort.col, optSort.dir))
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
    return [...list].sort((a, b) => compareOptExecutionGroups(a, b, optSort.col, optSort.dir))
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

  const effectiveStkCategoryTab = stkCategoryOptions.includes(stkCategoryTab)
    ? stkCategoryTab
    : 'All'

  const stkExecsForDisplay = useMemo(() => {
    if (effectiveStkCategoryTab === 'All') return stkExecsSorted
    if (effectiveStkCategoryTab === 'Uncategorized') {
      return stkExecsSorted.filter(e => {
        const c = catMap.get(`${e.account_id}|${e.contract_key?.trim() ?? ''}`) ?? '—'
        return c === '—'
      })
    }
    return stkExecsSorted.filter(e => {
      const c = catMap.get(`${e.account_id}|${e.contract_key?.trim() ?? ''}`) ?? '—'
      return c === effectiveStkCategoryTab
    })
  }, [stkExecsSorted, effectiveStkCategoryTab, catMap])

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

  const filteredStrategyOpportunityGroups = useMemo(() => {
    if (!optRightFilter) return strategyOpportunityGroups
    return strategyOpportunityGroups.filter(og =>
      og.instanceSubgroups.some(sg =>
        sg.groups.some(g => {
          const r = (g.contract_key?.split('|')[4] ?? '').toUpperCase().slice(0, 1)
          return r === optRightFilter
        }),
      ),
    )
  }, [strategyOpportunityGroups, optRightFilter])

  const strategyPanelOptionRights = useMemo((): ('C' | 'P')[] => {
    const rights = new Set<'C' | 'P'>()
    for (const og of strategyOpportunityGroups) {
      for (const sg of og.instanceSubgroups) {
        for (const g of sg.groups) {
          const r = (g.contract_key?.split('|')[4] ?? '').toUpperCase().slice(0, 1)
          if (r === 'C' || r === 'P') rights.add(r)
        }
      }
    }
    return Array.from(rights).sort()
  }, [strategyOpportunityGroups])

  const symbolSuggestions = useMemo(() => {
    const syms = new Set<string>()
    for (const e of bookData?.items ?? []) {
      const s = (e.symbol ?? '').trim().toUpperCase()
      if (s) syms.add(s)
    }
    return Array.from(syms).sort()
  }, [bookData])

  const activeFilterSummary = useMemo(() => {
    const parts: string[] = []
    if (symbolFilter.trim()) parts.push(`Symbol: ${symbolFilter.trim()}`)
    if (sincePreset !== 'all' && !expiryFilterYear) {
      const tab = LEDGER_SINCE_PRESET_TABS.find(t => t.id === sincePreset)
      parts.push(`Since: ${tab?.label ?? sincePreset}`)
    }
    if (expiryFilterYear) {
      parts.push(
        expiryFilterMonth
          ? `Expiry: ${expiryFilterYear}-${expiryFilterMonth}`
          : `Expiry year: ${expiryFilterYear}`,
      )
    }
    if (accountFilter !== 'all') {
      const acc = accountTabs.find(t => t.id === accountFilter)
      parts.push(`Account: ${acc?.label ?? accountFilter}`)
    }
    if (filterStructure) parts.push(`Structure: ${filterStructure}`)
    if (filterWishlistSymbol) parts.push(`Wishlist: ${filterWishlistSymbol}`)
    if (optRightFilter) parts.push(`Type: ${optRightFilter === 'C' ? 'Call' : 'Put'}`)
    return parts
  }, [
    symbolFilter,
    sincePreset,
    expiryFilterYear,
    expiryFilterMonth,
    accountFilter,
    accountTabs,
    filterStructure,
    filterWishlistSymbol,
    optRightFilter,
  ])

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
    if (groupBy === 'opportunity') return [{ key: '_all', label: '', groups: filteredStrategyOpportunityGroups }]
    if (groupBy === 'structure') {
      const m = new Map<string, StratOppGroupBase[]>()
      for (const og of filteredStrategyOpportunityGroups) {
        const k = og.structure || '—'
        const arr = m.get(k) ?? []; arr.push(og); m.set(k, arr)
      }
      return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b))
        .map(([k, g]) => ({ key: `struct:${k}`, label: k === '—' ? 'Unspecified structure' : k, groups: g }))
    }
    // watchlist_symbol
    const m = new Map<string, StratOppGroupBase[]>()
    for (const og of filteredStrategyOpportunityGroups) {
      const syms = og.symbols.length > 0 ? og.symbols : ['—']
      const seen = new Set<string>()
      for (const sym of syms) {
        if (seen.has(sym)) continue; seen.add(sym)
        const arr = m.get(sym) ?? []; arr.push(og); m.set(sym, arr)
      }
    }
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b))
      .map(([k, g]) => ({ key: `sym:${k}`, label: k === '—' ? 'No watchlist symbol' : k, groups: g }))
  }, [groupBy, filteredStrategyOpportunityGroups])

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

  // ── Tab availability ─────────────────────────────────────────────────────
  const hasOptExecs = optGroups.length > 0
  const hasStkExecs = stkByBucket.stocks.length > 0
  const hasFixedIncomeExecs = stkByBucket.fixed_income.length > 0
  const hasCashLikeExecs = stkByBucket.cash_like.length > 0

  useLedgerUiSync({
    stkCategoryOptions,
    stkCategoryTab,
    setStkCategoryTab,
    groupBy,
    strategyDisplayBuckets,
    instanceDisplayBuckets,
    setOuterStrategyExpanded,
    setOuterInstanceExpanded,
    activeTab,
    instanceSubTab,
    setInstanceSubTab,
    instanceGroupsRaw,
    hasOptExecs,
    hasStkExecs,
    hasFixedIncomeExecs,
    hasCashLikeExecs,
    isLoading,
    setActiveTab,
  })

  // ── Period summaries ─────────────────────────────────────────────────────
  const summaryClosedGroups = useMemo(
    () =>
      closedGroupsForLedgerSummary({
        activeTab,
        closedOptGroups,
        filteredClosedOptGroups,
        filteredStrategyOpportunityGroups,
        filteredInstanceGroups,
        noInstanceOptGroups,
      }),
    [
      activeTab,
      closedOptGroups,
      filteredClosedOptGroups,
      filteredStrategyOpportunityGroups,
      filteredInstanceGroups,
      noInstanceOptGroups,
    ],
  )

  const optionsSummaryByMonth = useMemo(
    () => buildOptionsSummaryByMonth(summaryClosedGroups, linkByOptionId),
    [summaryClosedGroups, linkByOptionId],
  )

  const stocksSummaryByMonth = useMemo(() => {
    const tab = activeTab as StkLedgerBucket
    const execs = stkByBucket[tab] ?? []
    return buildStocksSummaryByMonth(execs)
  }, [activeTab, stkByBucket])

  const closedOptGroupsPnlSum = useMemo(
    () => summaryClosedGroups.reduce((s, g) => s + adjustedRealizedPnlForOptGroup(g, linkByOptionId), 0),
    [summaryClosedGroups, linkByOptionId],
  )

  const stkUnrealizedByKey = useMemo(() => {
    const m = new Map<string, number | null>()
    for (const [key, snap] of stkPositionSnapshotMap.entries()) {
      if (!snap || Math.abs(snap.position) < 1e-9 || snap.price == null) {
        m.set(key, null)
        continue
      }
      m.set(key, snap.position * (snap.price - snap.avgCost))
    }
    return m
  }, [stkPositionSnapshotMap])

  const stkTotals = useMemo(() => {
    const execs = stkExecsForDisplay
    let notional = 0
    let realized = 0
    for (const e of execs) {
      notional += Math.abs(Number(e.quantity ?? e.qty) || 0) * (Number(e.price) || 0)
      realized += Number(e.realized_pnl) || 0
    }
    const seen = new Set<string>()
    let unrealized: number | null = 0
    let anyU = false
    for (const e of execs) {
      const ck = e.contract_key?.trim() ?? `${e.symbol.toUpperCase()}|STK|||`
      const key = `${e.account_id}|${ck}`
      if (seen.has(key)) continue
      seen.add(key)
      if (!stkUnrealizedByKey.has(key)) continue
      anyU = true
      const u = stkUnrealizedByKey.get(key)
      if (u != null && Number.isFinite(u)) unrealized = (unrealized ?? 0) + u
    }
    return {
      count: execs.length,
      notional,
      realized,
      unrealized: anyU ? unrealized : null,
    }
  }, [stkExecsForDisplay, stkUnrealizedByKey])

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
    const key = `${oppId}::${instId}`
    setStrategyInstExpanded(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
        return next
      }
      if (accordionMode) {
        for (const k of next) {
          if (k.startsWith(`${oppId}::`) && k !== key) next.delete(k)
        }
      }
      next.add(key)
      return next
    })
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
    setCreateSource('journal_closed')
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

  function handleHeaderAddJournal() {
    const accountId = accountFilter !== 'all'
      ? accountFilter
      : (accounts[0] ?? '')
    setCreateSource('journal_closed')
    setEditExec({
      account_executions_id: undefined as unknown as number,
      account_id: accountId,
      symbol: '',
      sec_type: 'STK',
      side: 'Buy',
      qty: 0,
      quantity: 0,
      price: 0,
      time: null,
    } as unknown as Execution)
  }

  function handleCloseEditModal() {
    setEditExec(null)
    setCreateSource('manual')
  }

  async function handleDelete() {
    if (!deleteTarget?.account_executions_id) return
    await deleteExecution(deleteTarget.account_executions_id)
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trading.executions })
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trading.executionsBook })
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
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trading.executions })
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trading.executionsBook })
    } finally {
      setSyncingId(null)
    }
  }

  const isStkTab = activeTab === 'stocks' || activeTab === 'fixed_income' || activeTab === 'cash_like'
  const sinceDisabled = sincePreset !== 'all'

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <PageShell padding="compact" className="space-y-3">
      <div className={styles.pageCard}>
        <PageHeader
          breadcrumb={<p className="text-xs text-primary/90 font-medium">Portfolio / Trade ledger</p>}
          title={
            <span className="inline-flex items-center gap-1.5">
              Trade ledger
              <InfoTooltip text={LEDGER_HELP} />
            </span>
          }
          actions={
            <>
              <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={handleHeaderAddJournal}>
                <Plus className="h-3.5 w-3.5" />
                Add journal
              </Button>
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
            </>
          }
        />

        {(canonError || bookError) && (
          <QueryErrorAlert
            error="Failed to load executions — check Trading API connection."
            onRetry={() => { void refetchCanon(); void refetchBook() }}
          />
        )}

        <LedgerFilterBar
          sincePreset={sincePreset}
          onSincePreset={setSincePreset}
          dateRange={dateRange}
          accountTabs={accountTabs}
          accountFilter={accountFilter}
          onAccountFilter={setAccountFilter}
          symbolFilter={symbolFilter}
          onSymbolFilter={setSymbolFilter}
          symbolSuggestions={symbolSuggestions}
          structureOptions={structureOptions}
          filterStructure={filterStructure}
          onFilterStructure={setFilterStructure}
          wishlistSymbolOptions={wishlistSymbolOptions}
          filterWishlistSymbol={filterWishlistSymbol}
          onFilterWishlistSymbol={setFilterWishlistSymbol}
          expiryFilterYear={expiryFilterYear}
          onExpiryFilterYear={setExpiryFilterYear}
          expiryFilterMonth={expiryFilterMonth}
          onExpiryFilterMonth={setExpiryFilterMonth}
          expiryYearOptions={expiryYearOptions}
          expiryMonthOptions={expiryMonthOptions}
          sinceDisabled={sinceDisabled}
          activeFilterSummary={activeFilterSummary}
          groupByPosition={groupByPosition}
          onToggleGroupByPosition={() => setGroupByPosition(v => !v)}
          showStkControls={false}
        />

        <LedgerTabToolbar
          activeTab={activeTab}
          onTabChange={tab => { setActiveTab(tab); setStkPage(0) }}
          hasOptExecs={hasOptExecs}
          hasStkExecs={hasStkExecs}
          hasFixedIncomeExecs={hasFixedIncomeExecs}
          hasCashLikeExecs={hasCashLikeExecs}
          accordionMode={accordionMode}
          onAccordionModeChange={setAccordionMode}
          filters={{
            activeTab,
            hasOptExecs,
            isStkTab,
            groupBy,
            setGroupBy,
            optRightFilter,
            setOptRightFilter,
            strategyPanelOptionRights,
            strategyOpportunityGroupsLength: strategyOpportunityGroups.length,
            filteredStrategyOpportunityGroupsLength: filteredStrategyOpportunityGroups.length,
            instanceSubTab,
            setInstanceSubTab,
            instanceGroupsWithCount: instanceGroupsRaw.withInst.length,
            noInstanceOptGroupsLength: noInstanceOptGroups.length,
            instanceContainOpenFilter,
            setInstanceContainOpenFilter,
            filteredInstanceGroupsLength: filteredInstanceGroups.length,
            instanceGroupsLength: instanceGroupsRaw.withInst.length,
            optSubTab,
            setOptSubTab,
            filteredClosedOptGroupsLength: filteredClosedOptGroups.length,
            allOrphanGroupsLength: allOrphanGroups.length,
            optInstanceFilter,
            setOptInstanceFilter,
            optSort,
            toggleOptSort,
            groupByPosition,
            setGroupByPosition,
            stkCategoryOptions,
            effectiveStkCategoryTab,
            setStkCategoryTab,
            setStkPage,
          }}
        />

        {!isLoading && (canonFiltered.length > 0 || bookFiltered.length > 0) && (
          <LedgerSummarySection
            activeTab={activeTab}
            summaryPeriod={summaryPeriod}
            onSummaryPeriodChange={setSummaryPeriod}
            optionsSummaryByMonth={optionsSummaryByMonth}
            stocksSummaryByMonth={stocksSummaryByMonth}
            summaryClosedGroups={summaryClosedGroups}
            closedOptGroupsPnlSum={closedOptGroupsPnlSum}
            stkFilteredExecutions={stkExecsForDisplay}
            stkUnrealizedByKey={stkUnrealizedByKey}
            stkTotals={stkTotals}
          />
        )}

        {!isLoading && canonFiltered.length === 0 && bookFiltered.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No execution data. Use Overview to fetch from IB (Refresh), or add a manual journal entry (Add journal).
            {activeFilterSummary.length > 0 ? ' Filters applied.' : ''}
          </p>
        )}

        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        )}

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
            onEdit={e => { setCreateSource('manual'); setEditExec(e) }}
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
            activeTab={activeTab}
            catMap={catMap}
            stkUnrealizedByKey={stkUnrealizedByKey}
            onEdit={e => { setCreateSource('manual'); setEditExec(e) }}
            onDelete={setDeleteTarget}
            onAddJournal={handleAddJournal}
          />
        )}

        {!isLoading && activeTab === 'strategy' && (
          filteredStrategyOpportunityGroups.length === 0 ? (
            <p className="text-xs text-muted-foreground">No opportunities match the current type filter.</p>
          ) : (
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
          />
          )
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
            onEdit={e => { setCreateSource('manual'); setEditExec(e) }}
            onDelete={setDeleteTarget}
            onLinkStrategy={setLinkStrategyTarget}
            onViewLinks={setViewLinksTarget}
            syncingId={syncingId}
            onSyncOpposite={handleSyncOppositeLeg}
          />
        )}
      </div>

      <TradeLedgerModals
        accounts={accounts}
        opportunities={oppData?.items ?? []}
        linkByOptionId={linkByOptionId}
        deleteTarget={deleteTarget}
        setDeleteTarget={setDeleteTarget}
        onDelete={handleDelete}
        editExec={editExec}
        setEditExec={e => { if (e === null) handleCloseEditModal(); else setEditExec(e) }}
        linkStrategyTarget={linkStrategyTarget}
        setLinkStrategyTarget={setLinkStrategyTarget}
        expiredCloseTarget={expiredCloseTarget}
        setExpiredCloseTarget={setExpiredCloseTarget}
        viewLinksTarget={viewLinksTarget}
        setViewLinksTarget={setViewLinksTarget}
        createSource={createSource}
      />
    </PageShell>
  )
}

