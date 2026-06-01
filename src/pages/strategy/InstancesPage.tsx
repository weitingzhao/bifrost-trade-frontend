import { useMemo, useState, useCallback, type CSSProperties } from 'react'
import { PageHeader, PageShell } from '@/components/layout'
import { Plus, RefreshCw } from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DetailSidebar } from '@/components/DetailSidebar'
import {
  InstancesGroupedTable,
} from '@/components/strategy/InstancesGroupedTable'
import { createCollapsedGroupsState } from '@/utils/instanceGroupCollapse'
import { InstanceCreateModal } from '@/components/strategy/InstanceCreateModal'
import { InstanceDeleteModal } from '@/components/strategy/InstanceDeleteModal'
import { InstanceDetailPanel } from '@/components/strategy/InstanceDetailPanel'
import { StrategyOpportunityCombobox } from '@/components/strategy/StrategyOpportunityCombobox'
import {
  InstanceListFilters,
  type InstanceListFilterValues,
  type SinceFilter,
} from '@/components/strategy/InstanceListFilters'
import { InstanceListToolbar, type DetailViewMode } from '@/components/strategy/InstanceListToolbar'
import { useStrategyInstances, useOpportunities } from '@/hooks/useStrategies'
import { useInstanceMetrics } from '@/hooks/useInstanceMetrics'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { useIsNarrowViewport, useWindowWidth } from '@/hooks/useIsNarrowViewport'
import {
  INSTANCE_COMPARE_MAX_WIDTH_PX,
  INSTANCE_DETAIL_SIDEBAR_WIDTH_PX,
} from '@/constants/instanceDetailSidebar'
import { computeInstancePositionStatus } from '@/utils/instanceListMetrics'
import type { StrategyInstance } from '@/types/positions'
import styles from './InstancesPage.module.css'

const INSTANCES_INFO =
  'Running strategy instances per account; create from an opportunity, inspect PnL and executions, or open the instance sheet.'

function ymdUtcMonthsAgo(months: number): string {
  const d = new Date()
  const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - months, d.getUTCDate()))
  return utc.toISOString().slice(0, 10)
}

function ymdUtcYtdStart(): string {
  return `${new Date().getUTCFullYear()}-01-01`
}

function ymdUtcToday(): string {
  return new Date().toISOString().slice(0, 10)
}

function sinceThresholdYmd(v: SinceFilter): string | null {
  if (v === '1m') return ymdUtcMonthsAgo(1)
  if (v === 'q') return ymdUtcMonthsAgo(3)
  if (v === 'half') return ymdUtcMonthsAgo(6)
  if (v === '1y') return ymdUtcMonthsAgo(12)
  if (v === 'ytd') return ymdUtcYtdStart()
  return null
}

function getScopeSymbol(
  inst: StrategyInstance,
  opportunities: { strategy_opportunity_id: number; scope_type: string | null; symbols: string[] }[],
): string {
  const opp = opportunities.find((o) => o.strategy_opportunity_id === inst.strategy_opportunity_id)
  if (!opp) return '—'
  const st = (opp.scope_type ?? '').trim()
  if (st !== 'explicit_symbols' && st !== 'watchlist_stk') return '—'
  const sym = opp.symbols?.filter((s) => s?.trim())
  if (!sym || sym.length === 0) return '—'
  return sym[0].trim().toUpperCase()
}

function parseUrlInstanceId(param: string | undefined): number | null {
  if (!param) return null
  const n = Number(param)
  return Number.isFinite(n) && n > 0 ? n : null
}

export default function InstancesPage() {
  const navigate = useNavigate()
  const { instanceId: instanceIdParam } = useParams()
  const urlInstanceId = useMemo(() => parseUrlInstanceId(instanceIdParam), [instanceIdParam])
  const isNarrowViewport = useIsNarrowViewport()
  const windowWidth = useWindowWidth()

  const { data: status } = useMonitorStatus()
  const { data: oppsData, isFetching: oppsFetching } = useOpportunities()

  const accounts = useMemo(
    () => (status?.portfolio?.accounts ?? []).map((a) => a.account_id).filter(Boolean) as string[],
    [status],
  )
  const opportunities = useMemo(() => oppsData?.items ?? [], [oppsData])

  const [accountFilter, setAccountFilter] = useState<string>('')
  const [opportunityIdFilter, setOpportunityIdFilter] = useState<number | ''>('')
  const [instanceIdFilter, setInstanceIdFilter] = useState<number | ''>('')

  const { data, isLoading, isError, error, refetch, isFetching } = useStrategyInstances({
    accountId: accountFilter || undefined,
    opportunityId: opportunityIdFilter === '' ? undefined : opportunityIdFilter,
  })

  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<StrategyInstance | null>(null)
  const [compareTarget, setCompareTarget] = useState<StrategyInstance | null>(null)

  const location = useLocation()
  const locationStructureFilter =
    (location.state as { structureFilter?: string } | null)?.structureFilter ?? ''

  const [filterValues, setFilterValues] = useState<InstanceListFilterValues>({
    status: '',
    structure: locationStructureFilter,
    symbol: '',
    right: '',
    expiry: '',
    since: 'q',
  })
  const [detailViewMode, setDetailViewMode] = useState<DetailViewMode>('accordion')
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
  const [metricsRefreshKey, setMetricsRefreshKey] = useState(0)

  const allInstances = useMemo(() => data?.items ?? [], [data])
  const metricsMap = useInstanceMetrics(allInstances, metricsRefreshKey)

  const detailTarget = useMemo(() => {
    if (urlInstanceId == null) return null
    return allInstances.find((i) => i.strategy_instance_id === urlInstanceId) ?? null
  }, [allInstances, urlInstanceId])

  const detailMissing = urlInstanceId != null && !isLoading && detailTarget == null

  const isCompareMode =
    compareTarget != null &&
    urlInstanceId != null &&
    compareTarget.strategy_instance_id !== urlInstanceId

  const sidebarWidth = isCompareMode
    ? Math.min(INSTANCE_COMPARE_MAX_WIDTH_PX, windowWidth - 40)
    : INSTANCE_DETAIL_SIDEBAR_WIDTH_PX

  const pageCardStyle = useMemo((): CSSProperties | undefined => {
    if (urlInstanceId == null || isNarrowViewport) return undefined
    return {
      ['--instances-floating-sidebar-width' as string]: `${sidebarWidth}px`,
      ['--instances-floating-sidebar-reserve' as string]: `calc(${sidebarWidth}px + 4px)`,
    }
  }, [urlInstanceId, isNarrowViewport, sidebarWidth])

  const sidebarTitle = isCompareMode && compareTarget != null && urlInstanceId != null
    ? `Strategy Instance · #${urlInstanceId} vs #${compareTarget.strategy_instance_id}`
    : urlInstanceId != null
      ? `Strategy Instance · #${urlInstanceId}`
      : 'Detail'

  const openInstanceDetail = useCallback((inst: StrategyInstance) => {
    navigate(`/strategy/instances/${inst.strategy_instance_id}`)
  }, [navigate])

  const closeInstanceDetail = useCallback(() => {
    setCompareTarget(null)
    navigate('/strategy/instances', { replace: true })
  }, [navigate])

  const instancesForOpportunity = useMemo(() => {
    if (opportunityIdFilter === '') return []
    return allInstances.filter((i) => i.strategy_opportunity_id === opportunityIdFilter)
  }, [allInstances, opportunityIdFilter])

  const instancePositionMeta = useMemo(() => {
    const map = new Map<number, { rights: Set<'C' | 'P'>; expiryMonths: Set<string> }>()
    for (const inst of allInstances) {
      const entry = metricsMap.get(inst.strategy_instance_id)
      if (entry?.status !== 'ready') continue
      if (!map.has(inst.strategy_instance_id)) {
        map.set(inst.strategy_instance_id, { rights: new Set(), expiryMonths: new Set() })
      }
      const meta = map.get(inst.strategy_instance_id)!
      for (const e of entry.sliced) {
        if ((e.sec_type ?? '').toUpperCase() !== 'OPT') continue
        const right = (e.option_right ?? e.right ?? '').toUpperCase().charAt(0)
        if (right === 'C' || right === 'P') meta.rights.add(right)
        const exp = (e.expiry ?? '').replace(/\D/g, '')
        const ym = exp.length >= 6 ? `${exp.slice(0, 4)}-${exp.slice(4, 6)}` : null
        if (ym) meta.expiryMonths.add(ym)
      }
    }
    return map
  }, [allInstances, metricsMap])

  const filterOptions = useMemo(() => {
    const structures = new Set<string>()
    const symbols = new Set<string>()
    const rights = new Set<'C' | 'P'>()
    const expiryMonths = new Set<string>()
    for (const inst of allInstances) {
      const sn = (inst.strategy_structure_name ?? '').trim()
      if (sn) structures.add(sn)
      const sym = getScopeSymbol(inst, opportunities)
      if (sym !== '—') symbols.add(sym)
      const meta = instancePositionMeta.get(inst.strategy_instance_id)
      if (meta) {
        for (const r of meta.rights) rights.add(r)
        for (const m of meta.expiryMonths) expiryMonths.add(m)
      }
    }
    return {
      structures: Array.from(structures).sort(),
      symbols: Array.from(symbols).sort(),
      rights: Array.from(rights).sort(),
      expiryMonths: Array.from(expiryMonths).sort(),
    }
  }, [allInstances, opportunities, instancePositionMeta])

  const filtered = useMemo(() => {
    let list = allInstances

    if (instanceIdFilter !== '') {
      list = list.filter((inst) => inst.strategy_instance_id === instanceIdFilter)
    }

    if (filterValues.structure) {
      list = list.filter((inst) => (inst.strategy_structure_name ?? '').trim() === filterValues.structure)
    }

    if (filterValues.symbol) {
      list = list.filter((inst) => getScopeSymbol(inst, opportunities) === filterValues.symbol)
    }

    if (filterValues.right) {
      list = list.filter((inst) => {
        const meta = instancePositionMeta.get(inst.strategy_instance_id)
        return meta?.rights.has(filterValues.right as 'C' | 'P') ?? false
      })
    }

    if (filterValues.expiry) {
      list = list.filter((inst) => {
        const meta = instancePositionMeta.get(inst.strategy_instance_id)
        return meta?.expiryMonths.has(filterValues.expiry) ?? false
      })
    }

    if (filterValues.status) {
      list = list.filter((inst) => {
        const entry = metricsMap.get(inst.strategy_instance_id)
        if (!entry || entry.status !== 'ready') return false
        const ps = computeInstancePositionStatus(entry.sliced)
        return filterValues.status === 'open' ? ps === 'open' : ps === 'closed'
      })
    }

    if (filterValues.since) {
      const threshold = sinceThresholdYmd(filterValues.since)
      if (threshold) {
        const thresholdTs = new Date(threshold).getTime() / 1000
        list = list.filter((inst) => {
          if (inst.opened_at_epoch == null) return false
          return inst.opened_at_epoch >= thresholdTs
        })
      }
    }

    return list
  }, [
    allInstances,
    instanceIdFilter,
    filterValues,
    metricsMap,
    opportunities,
    instancePositionMeta,
  ])

  const groupedItems = useMemo(() => {
    const groups: { key: string; label: string; rows: StrategyInstance[] }[] = []
    const indexByKey = new Map<string, number>()
    for (const inst of filtered) {
      const sym = getScopeSymbol(inst, opportunities)
      const idx = indexByKey.get(sym)
      if (idx == null) {
        indexByKey.set(sym, groups.length)
        groups.push({ key: sym, label: sym, rows: [inst] })
      } else {
        groups[idx].rows.push(inst)
      }
    }
    return groups
  }, [filtered, opportunities])

  const sinceRangeText = useMemo(() => {
    if (!filterValues.since) return null
    const start = sinceThresholdYmd(filterValues.since)
    if (!start) return null
    return `${start} ~ ${ymdUtcToday()}`
  }, [filterValues.since])

  const clearAllFilters = useCallback(() => {
    setFilterValues({
      status: '',
      structure: '',
      symbol: '',
      right: '',
      expiry: '',
      since: '',
    })
    setInstanceIdFilter('')
  }, [])

  const handleToggleGroup = useCallback(
    (key: string) => {
      setCollapsedGroups((prev) =>
        createCollapsedGroupsState(groupedItems, detailViewMode, prev, 'toggle', key),
      )
    },
    [groupedItems, detailViewMode],
  )

  const handleExpandAll = useCallback(() => {
    setCollapsedGroups((prev) =>
      createCollapsedGroupsState(groupedItems, detailViewMode, prev, 'expandAll'),
    )
  }, [groupedItems, detailViewMode])

  const handleCollapseAll = useCallback(() => {
    setCollapsedGroups((prev) =>
      createCollapsedGroupsState(groupedItems, detailViewMode, prev, 'collapseAll'),
    )
  }, [groupedItems, detailViewMode])

  if (isLoading) {
    return (
      <PageShell className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-64 rounded-lg" />
      </PageShell>
    )
  }

  return (
    <PageShell>
      <div className={styles.pageCard} style={pageCardStyle}>
        <PageHeader
          title={
            <span className="inline-flex items-center gap-1">
              Strategy / Instances
              <InfoTooltip text={INSTANCES_INFO} />
            </span>
          }
          titleSize="large"
          actions={
            <>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5"
                onClick={() => {
                  setMetricsRefreshKey((k) => k + 1)
                  void refetch()
                }}
                disabled={isFetching}
              >
                <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
                {isFetching ? 'Loading…' : 'Refresh'}
              </Button>
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Create instance
              </Button>
            </>
          }
        />

        <div className={styles.filterRow}>
          <label className={styles.filterField}>
            <span className={styles.filterLabel}>Account</span>
            <select
              className={styles.filterSelect}
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              aria-label="Filter by account"
            >
              <option value="">All accounts</option>
              {accounts.map((id) => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>
          </label>

          <label className={styles.filterField}>
            <span className={styles.filterLabel}>Strategy</span>
            <StrategyOpportunityCombobox
              opportunities={opportunities}
              value={opportunityIdFilter}
              disabled={oppsFetching}
              onChange={(id) => {
                setOpportunityIdFilter(id)
                setInstanceIdFilter('')
              }}
            />
          </label>

          {opportunityIdFilter !== '' && (
            <label className={styles.filterField}>
              <span className={styles.filterLabel}>Instance</span>
              <Select
                value={instanceIdFilter === '' ? '__all__' : String(instanceIdFilter)}
                onValueChange={(v) => setInstanceIdFilter(v === '__all__' ? '' : Number(v))}
              >
                <SelectTrigger className="h-8 w-44 text-xs">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All</SelectItem>
                  {instancesForOpportunity.map((si) => (
                    <SelectItem key={si.strategy_instance_id} value={String(si.strategy_instance_id)}>
                      {si.label?.trim() || `#${si.strategy_instance_id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          )}
        </div>

        {isError && (
          <QueryErrorAlert error={error} onRetry={() => void refetch()} />
        )}

        <div className={styles.workspace}>
          <div
            className={cn(
              styles.listPane,
              urlInstanceId != null && !isNarrowViewport && styles.listPaneWithSidebar,
            )}
          >
            {allInstances.length > 0 && (
              <InstanceListFilters
                options={filterOptions}
                values={filterValues}
                sinceRangeText={sinceRangeText}
                filteredCount={filtered.length}
                totalCount={allInstances.length}
                onChange={(patch) => setFilterValues((v) => ({ ...v, ...patch }))}
                onClear={clearAllFilters}
              />
            )}

            {groupedItems.length > 0 && (
              <InstanceListToolbar
                detailViewMode={detailViewMode}
                onDetailViewModeChange={setDetailViewMode}
                onExpandAll={handleExpandAll}
                onCollapseAll={handleCollapseAll}
              />
            )}

            <InstancesGroupedTable
              groups={groupedItems}
              metricsMap={metricsMap}
              detailViewMode={detailViewMode}
              collapsedGroups={collapsedGroups}
              onToggleGroup={handleToggleGroup}
              onDelete={setDeleteTarget}
              onViewDetail={openInstanceDetail}
              onCompare={(inst) =>
                setCompareTarget(
                  compareTarget?.strategy_instance_id === inst.strategy_instance_id ? null : inst,
                )
              }
              activeDetailId={urlInstanceId}
              compareId={compareTarget?.strategy_instance_id ?? null}
            />
          </div>

          {urlInstanceId != null && (
            <div className={styles.inspectorPane}>
              <DetailSidebar
                open
                mode={isNarrowViewport ? 'modal' : 'docked'}
                width={sidebarWidth}
                title={sidebarTitle}
                onClose={closeInstanceDetail}
              >
                {detailMissing ? (
                  <p className={styles.notFound}>Instance not found.</p>
                ) : detailTarget == null ? (
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-32 w-full" />
                  </div>
                ) : isCompareMode && compareTarget != null ? (
                  <div className={styles.compareSplit}>
                    <div className={styles.comparePane}>
                      <InstanceDetailPanel instance={detailTarget} />
                    </div>
                    <div className={styles.compareDivider} aria-hidden />
                    <div className={styles.comparePane}>
                      <InstanceDetailPanel instance={compareTarget} />
                    </div>
                  </div>
                ) : (
                  <InstanceDetailPanel instance={detailTarget} />
                )}
              </DetailSidebar>
            </div>
          )}
        </div>
      </div>

      <InstanceCreateModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        status={status}
      />
      <InstanceDeleteModal
        instance={deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      />
    </PageShell>
  )
}
