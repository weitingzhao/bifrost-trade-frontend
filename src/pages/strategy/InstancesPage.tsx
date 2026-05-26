import { useMemo, useState, useCallback } from 'react'
import { Plus, RefreshCw, X } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { InstancesGroupedTable } from '@/components/strategy/InstancesGroupedTable'
import { InstanceCreateModal } from '@/components/strategy/InstanceCreateModal'
import { InstanceDeleteModal } from '@/components/strategy/InstanceDeleteModal'
import { InstanceDetailPanel } from '@/components/strategy/InstanceDetailPanel'
import { useStrategyInstances, useOpportunities } from '@/hooks/useStrategies'
import { useInstanceMetrics } from '@/hooks/useInstanceMetrics'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import type { StrategyInstance } from '@/types/positions'
import type { MetricsEntry } from '@/hooks/useInstanceMetrics'

// ── Filter types ─────────────────────────────────────────────────────────────

type SinceFilter = '' | '1m' | 'q' | 'half' | '1y' | 'ytd'
type StatusFilter = '' | 'open' | 'closed'
type DetailViewMode = 'accordion' | 'multi'

const SINCE_OPTIONS: { key: SinceFilter; label: string }[] = [
  { key: '', label: 'All' },
  { key: '1m', label: '1 month' },
  { key: 'q', label: 'Quarter' },
  { key: 'half', label: 'Half year' },
  { key: '1y', label: '1 year' },
  { key: 'ytd', label: 'YTD' },
]

// ── Since threshold helpers ──────────────────────────────────────────────────

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

import { structureChipStyle } from '@/utils/structureColor'

// ── Bubble filter button ─────────────────────────────────────────────────────

function BubbleButton({
  active,
  onClick,
  children,
  style,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      className={cn(
        'text-xs px-2.5 py-1 rounded-full border transition-colors whitespace-nowrap',
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/40',
      )}
    >
      {children}
    </button>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

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

function getPositionStatus(entry: MetricsEntry | undefined): 'open' | 'closed' | 'unknown' {
  if (!entry || entry.status !== 'ready') return 'unknown'
  // Use holdDays == opened_at → now as a rough proxy;
  // the actual status needs execution-derived data which we have in metrics
  return entry.metrics.holdDays > 0 && entry.metrics.netPnl === 0 && entry.metrics.tradeCount === 0
    ? 'unknown'
    : 'open' // Simplified: legacy determines from exec book
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function InstancesPage() {
  const queryClient = useQueryClient()
  const { data: status } = useMonitorStatus()
  const { data: oppsData } = useOpportunities()

  const accounts = useMemo(
    () => (status?.portfolio?.accounts ?? []).map((a) => a.account_id).filter(Boolean) as string[],
    [status],
  )
  const opportunities = useMemo(() => oppsData?.items ?? [], [oppsData])

  // API-level filters
  const [accountFilter, setAccountFilter] = useState<string>('')
  const [opportunitySearch, setOpportunitySearch] = useState<string>('')

  const { data, isLoading, isError, error } = useStrategyInstances({
    accountId: accountFilter || undefined,
  })

  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<StrategyInstance | null>(null)
  const [detailTarget, setDetailTarget] = useState<StrategyInstance | null>(null)
  const [compareTarget, setCompareTarget] = useState<StrategyInstance | null>(null)

  // In-panel bubble filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('')
  const [structureFilter, setStructureFilter] = useState<string>('')
  const [symbolFilter, setSymbolFilter] = useState<string>('')
  const [sinceFilter, setSinceFilter] = useState<SinceFilter>('q')
  const [detailViewMode, setDetailViewMode] = useState<DetailViewMode>('accordion')

  const allInstances = useMemo(() => data?.items ?? [], [data])
  const metricsMap = useInstanceMetrics(allInstances)

  // Derive filter options from data
  const filterOptions = useMemo(() => {
    const structures = new Set<string>()
    const symbols = new Set<string>()
    for (const inst of allInstances) {
      const sn = (inst.strategy_structure_name ?? '').trim()
      if (sn) structures.add(sn)
      const sym = getScopeSymbol(inst, opportunities)
      if (sym !== '—') symbols.add(sym)
    }
    return {
      structures: Array.from(structures).sort(),
      symbols: Array.from(symbols).sort(),
    }
  }, [allInstances, opportunities])

  // Apply all in-panel filters
  const filtered = useMemo(() => {
    let list = allInstances

    // Text search on opportunity name
    if (opportunitySearch.trim()) {
      const q = opportunitySearch.trim().toLowerCase()
      list = list.filter((inst) =>
        (inst.strategy_opportunity_name ?? '').toLowerCase().includes(q) ||
        (inst.label ?? '').toLowerCase().includes(q),
      )
    }

    if (structureFilter) {
      list = list.filter((inst) => (inst.strategy_structure_name ?? '').trim() === structureFilter)
    }

    if (symbolFilter) {
      list = list.filter((inst) => getScopeSymbol(inst, opportunities) === symbolFilter)
    }

    if (statusFilter) {
      list = list.filter((inst) => {
        const entry = metricsMap.get(inst.strategy_instance_id)
        const ps = getPositionStatus(entry)
        return statusFilter === 'open' ? ps === 'open' : ps === 'closed'
      })
    }

    if (sinceFilter) {
      const threshold = sinceThresholdYmd(sinceFilter)
      if (threshold) {
        const thresholdTs = new Date(threshold).getTime() / 1000
        list = list.filter((inst) => {
          if (inst.opened_at_epoch == null) return false
          return inst.opened_at_epoch >= thresholdTs
        })
      }
    }

    return list
  }, [allInstances, opportunitySearch, structureFilter, symbolFilter, statusFilter, sinceFilter, metricsMap, opportunities])

  // Group by symbol
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

  // Since range text
  const sinceRangeText = useMemo(() => {
    if (!sinceFilter) return null
    const start = sinceThresholdYmd(sinceFilter)
    if (!start) return null
    return `${start} ~ ${ymdUtcToday()}`
  }, [sinceFilter])

  // Any filter active?
  const hasActiveFilter = !!(statusFilter || structureFilter || symbolFilter || sinceFilter || opportunitySearch.trim())

  const clearAllFilters = useCallback(() => {
    setStatusFilter('')
    setStructureFilter('')
    setSymbolFilter('')
    setSinceFilter('')
    setOpportunitySearch('')
  }, [])

  if (isLoading) {
    return (
      <div className="p-6 space-y-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Strategy / Instances</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['strategy', 'instances'] })}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Create instance
          </Button>
        </div>
      </div>

      {/* Top-level filters: Account + Opportunity search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Account</span>
          <Select value={accountFilter || '__all__'} onValueChange={(v) => setAccountFilter(v === '__all__' ? '' : v)}>
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue placeholder="All accounts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All accounts</SelectItem>
              {accounts.map((id) => (
                <SelectItem key={id} value={id}>{id}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Input
          placeholder="All strategies"
          value={opportunitySearch}
          onChange={(e) => setOpportunitySearch(e.target.value)}
          className="h-8 w-48 text-xs"
        />
      </div>

      {/* Bubble filter panel */}
      {allInstances.length > 0 && (
        <div className="space-y-2 rounded-lg border border-border p-3">
          {/* Status */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-16 shrink-0">Status</span>
            <div className="flex flex-wrap gap-1">
              {(['', 'open', 'closed'] as StatusFilter[]).map((key) => (
                <BubbleButton
                  key={key || 'all'}
                  active={statusFilter === key}
                  onClick={() => setStatusFilter(statusFilter === key ? '' : key)}
                >
                  {key === '' ? 'All' : key === 'open' ? 'Open' : 'Closed'}
                </BubbleButton>
              ))}
            </div>
          </div>

          {/* Structure */}
          {filterOptions.structures.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-16 shrink-0">Structure</span>
              <div className="flex flex-wrap gap-1">
                <BubbleButton
                  active={structureFilter === ''}
                  onClick={() => setStructureFilter('')}
                >
                  All
                </BubbleButton>
                {filterOptions.structures.map((s) => (
                  <BubbleButton
                    key={s}
                    active={structureFilter === s}
                    onClick={() => setStructureFilter(structureFilter === s ? '' : s)}
                    style={structureChipStyle(s, structureFilter === s)}
                  >
                    {s}
                  </BubbleButton>
                ))}
              </div>
            </div>
          )}

          {/* Symbol */}
          {filterOptions.symbols.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-16 shrink-0">Symbol</span>
              <div className="flex flex-wrap gap-1">
                <BubbleButton
                  active={symbolFilter === ''}
                  onClick={() => setSymbolFilter('')}
                >
                  All
                </BubbleButton>
                {filterOptions.symbols.map((sym) => (
                  <BubbleButton
                    key={sym}
                    active={symbolFilter === sym}
                    onClick={() => setSymbolFilter(symbolFilter === sym ? '' : sym)}
                  >
                    {sym}
                  </BubbleButton>
                ))}
              </div>
            </div>
          )}

          {/* Since */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-16 shrink-0">Since</span>
            <div className="flex flex-wrap items-center gap-1">
              {SINCE_OPTIONS.map(({ key, label }) => (
                <BubbleButton
                  key={key || 'all'}
                  active={sinceFilter === key}
                  onClick={() => setSinceFilter(sinceFilter === key ? '' : key)}
                >
                  {label}
                </BubbleButton>
              ))}
              {sinceRangeText && (
                <span className="text-[11px] text-muted-foreground ml-2">
                  {sinceRangeText}
                </span>
              )}
            </div>
          </div>

          {/* Meta: count + clear */}
          {hasActiveFilter && (
            <div className="flex items-center gap-3 pt-1 border-t border-border/50">
              <span className="text-xs text-muted-foreground">
                Showing {filtered.length} of {allInstances.length} instances
              </span>
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-xs text-primary hover:underline flex items-center gap-0.5"
              >
                <X className="h-3 w-3" />
                Clear filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Detail view mode + Symbol groups controls */}
      {groupedItems.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground uppercase tracking-wide font-medium">Detail view</span>
            <div className="flex gap-0.5">
              <BubbleButton
                active={detailViewMode === 'accordion'}
                onClick={() => setDetailViewMode('accordion')}
              >
                Accordion
              </BubbleButton>
              <BubbleButton
                active={detailViewMode === 'multi'}
                onClick={() => setDetailViewMode('multi')}
              >
                Multi
              </BubbleButton>
            </div>
          </div>
          <span className="text-muted-foreground/50">|</span>
          <span className="text-muted-foreground italic text-[11px]">
            {detailViewMode === 'accordion'
              ? 'Accordion: only one symbol group expanded at a time. Expand all keeps the first group open.'
              : 'Multi: several symbol groups may stay expanded.'}
          </span>
        </div>
      )}

      {isError && (
        <Alert variant="destructive">
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      )}

      {/* Split layout: list (left, compressed when detail open) + detail (right) */}
      <div className={cn(
        'flex gap-0 transition-all',
        detailTarget != null && 'items-start',
      )}>
        {/* Table pane */}
        <div className={cn(
          'transition-all shrink-0 overflow-auto',
          detailTarget != null ? 'w-[280px] max-h-[calc(100vh-220px)]' : 'w-full',
        )}>
          <InstancesGroupedTable
            groups={groupedItems}
            metricsMap={metricsMap}
            opportunities={opportunities}
            detailViewMode={detailViewMode}
            onDelete={setDeleteTarget}
            onViewDetail={setDetailTarget}
            onCompare={(inst) => setCompareTarget(compareTarget?.strategy_instance_id === inst.strategy_instance_id ? null : inst)}
            activeDetailId={detailTarget?.strategy_instance_id ?? null}
            compareId={compareTarget?.strategy_instance_id ?? null}
            compact={detailTarget != null}
          />
        </div>

        {/* Detail panel (docked sidebar) */}
        {detailTarget != null && (
          <div className={cn(
            'flex-1 min-w-0 border-l border-border overflow-auto max-h-[calc(100vh-220px)]',
            compareTarget != null && 'grid grid-cols-2 gap-0 divide-x divide-border',
          )}>
            <InstanceDetailPanel
              instance={detailTarget}
              onClose={() => { setDetailTarget(null); setCompareTarget(null) }}
            />
            {compareTarget != null && (
              <InstanceDetailPanel
                instance={compareTarget}
                onClose={() => setCompareTarget(null)}
              />
            )}
          </div>
        )}
      </div>

      <InstanceCreateModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        status={status}
      />
      <InstanceDeleteModal
        instance={deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
      />
    </div>
  )
}
