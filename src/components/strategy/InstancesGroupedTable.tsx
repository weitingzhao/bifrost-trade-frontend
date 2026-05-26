import { useState, useCallback, useMemo } from 'react'
import { ChevronRight, ChevronDown, Trash2, Eye, ArrowUpDown, ArrowUp, ArrowDown, Columns2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { structureChipStyle } from '@/utils/structureColor'
import type { StrategyInstance, StrategyOpportunity } from '@/types/positions'
import type { MetricsEntry } from '@/hooks/useInstanceMetrics'

// ── Types ────────────────────────────────────────────────────────────────────

interface SymbolGroup {
  key: string
  label: string
  rows: StrategyInstance[]
}

type SortColumn = 'net' | 'npd' | 'und' | 'ret' | 'ann' | 'comm' | 'hold' | 'exec'
type SortDir = 'asc' | 'desc'

interface Props {
  groups: SymbolGroup[]
  metricsMap: Map<number, MetricsEntry>
  opportunities: StrategyOpportunity[]
  detailViewMode: 'accordion' | 'multi'
  onDelete: (instance: StrategyInstance) => void
  onViewDetail?: (instance: StrategyInstance) => void
  onCompare?: (instance: StrategyInstance) => void
  activeDetailId?: number | null
  compareId?: number | null
  compact?: boolean
}
// ── Format helpers ───────────────────────────────────────────────────────────

function fmtUsd(n: number | null | undefined): string {
  if (n == null) return '—'
  const abs = Math.abs(n)
  const formatted = abs >= 10000
    ? `$${(abs / 1000).toFixed(1)}k`
    : abs >= 1000
      ? `$${(abs / 1000).toFixed(2)}k`
      : `$${abs.toFixed(0)}`
  return n < 0 ? `-${formatted}` : formatted
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return '—'
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`
}

function pnlClass(n: number | null | undefined): string {
  if (n == null) return 'text-muted-foreground'
  return n > 0.001 ? 'text-green-600 dark:text-green-400' : n < -0.001 ? 'text-red-500' : 'text-muted-foreground'
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
}

function holdDaysDisplay(openedAt: string | null): string {
  if (!openedAt) return '—'
  const days = Math.floor((Date.now() - new Date(openedAt).getTime()) / 86_400_000)
  return days <= 0 ? '<1d' : `${days}d`
}

// ── Sort logic ───────────────────────────────────────────────────────────────

function getSortValue(inst: StrategyInstance, entry: MetricsEntry | undefined, col: SortColumn): number {
  if (!entry || entry.status !== 'ready') return NaN
  const m = entry.metrics
  switch (col) {
    case 'net': return m.netPnl
    case 'npd': return m.netPnlPerDay ?? NaN
    case 'und': return m.underlyingCost ?? NaN
    case 'ret': return m.returnPct ?? NaN
    case 'ann': return m.annualPct ?? NaN
    case 'comm': return m.commission
    case 'hold': return m.holdDays
    case 'exec': return inst.executions_count
  }
}

// ── Group Rollup ─────────────────────────────────────────────────────────────

function computeGroupRollup(rows: StrategyInstance[], metricsMap: Map<number, MetricsEntry>) {
  let totalNet = 0
  let sumUnderlying = 0
  let anyReady = false

  for (const row of rows) {
    const entry = metricsMap.get(row.strategy_instance_id)
    if (!entry || entry.status !== 'ready') continue
    anyReady = true
    totalNet += entry.metrics.netPnl
    if (entry.metrics.underlyingCost != null) sumUnderlying += entry.metrics.underlyingCost
  }

  const groupAnnualPct = sumUnderlying > 0 ? (totalNet / sumUnderlying) * 365.25 / 30 * 100 : null

  return {
    totalNet: anyReady ? totalNet : null,
    sumUnderlying: sumUnderlying > 0 ? sumUnderlying : null,
    groupAnnualPct: groupAnnualPct != null && isFinite(groupAnnualPct)
      ? Math.min(999, Math.max(-999, groupAnnualPct))
      : null,
  }
}

// ── Sortable header ──────────────────────────────────────────────────────────

function SortableHead({
  column,
  sort,
  onSort,
  children,
  className,
}: {
  column: SortColumn
  sort: { column: SortColumn; dir: SortDir } | null
  onSort: (col: SortColumn) => void
  children: React.ReactNode
  className?: string
}) {
  const active = sort?.column === column
  const Icon = active ? (sort.dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown
  return (
    <TableHead
      className={cn('cursor-pointer select-none text-right', className)}
      onClick={() => onSort(column)}
    >
      <span className="inline-flex items-center gap-0.5">
        {children}
        <Icon className={cn('h-3 w-3', active ? 'text-foreground' : 'text-muted-foreground/40')} />
      </span>
    </TableHead>
  )
}

// ── Component ────────────────────────────────────────────────────────────────

export function InstancesGroupedTable({ groups, metricsMap, detailViewMode, onDelete, onViewDetail, onCompare, activeDetailId, compareId, compact }: Omit<Props, 'opportunities'> & { opportunities?: StrategyOpportunity[] }) {
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
  const [sort, setSort] = useState<{ column: SortColumn; dir: SortDir } | null>(null)

  const toggleGroup = useCallback((key: string) => {
    setCollapsedGroups((prev) => {
      if (detailViewMode === 'accordion') {
        const wasCollapsed = Boolean(prev[key])
        if (wasCollapsed) {
          const next: Record<string, boolean> = {}
          for (const g of groups) next[g.key] = true
          delete next[key]
          return next
        }
        return { ...prev, [key]: true }
      }
      return { ...prev, [key]: !prev[key] }
    })
  }, [detailViewMode, groups])

  const expandAll = useCallback(() => {
    if (detailViewMode === 'accordion' && groups.length > 0) {
      const next: Record<string, boolean> = {}
      for (const g of groups) next[g.key] = true
      delete next[groups[0].key]
      setCollapsedGroups(next)
    } else {
      setCollapsedGroups({})
    }
  }, [detailViewMode, groups])

  const collapseAll = useCallback(() => {
    const next: Record<string, boolean> = {}
    for (const g of groups) next[g.key] = true
    setCollapsedGroups(next)
  }, [groups])

  const toggleSort = useCallback((col: SortColumn) => {
    setSort((prev) => {
      if (prev?.column !== col) return { column: col, dir: 'desc' }
      return { column: col, dir: prev.dir === 'desc' ? 'asc' : 'desc' }
    })
  }, [])

  // Sort rows within each group
  const sortedGroups = useMemo(() => {
    if (!sort) return groups
    return groups.map((g) => ({
      ...g,
      rows: [...g.rows].sort((a, b) => {
        const va = getSortValue(a, metricsMap.get(a.strategy_instance_id), sort.column)
        const vb = getSortValue(b, metricsMap.get(b.strategy_instance_id), sort.column)
        const mul = sort.dir === 'asc' ? 1 : -1
        if (isNaN(va) && isNaN(vb)) return 0
        if (isNaN(va)) return 1
        if (isNaN(vb)) return -1
        return (va - vb) * mul
      }),
    }))
  }, [groups, sort, metricsMap])

  if (groups.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">No instances found.</p>
  }

  return (
    <div className="space-y-0">
      {/* Symbol groups toolbar */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Symbol groups</span>
        <Button variant="outline" size="sm" className="h-6 text-[11px] px-2" onClick={expandAll}>
          Expand all
        </Button>
        <Button variant="outline" size="sm" className="h-6 text-[11px] px-2" onClick={collapseAll}>
          Collapse all
        </Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">ID</TableHead>
              <TableHead className={compact ? '' : 'min-w-[200px]'}>Opportunity</TableHead>
              {!compact && <TableHead>Status</TableHead>}
              {!compact && <TableHead className="text-right">Period</TableHead>}
              {!compact && <SortableHead column="net" sort={sort} onSort={toggleSort}>Net PnL</SortableHead>}
              {!compact && <SortableHead column="npd" sort={sort} onSort={toggleSort}>/ day</SortableHead>}
              {!compact && <SortableHead column="und" sort={sort} onSort={toggleSort}>Underlying</SortableHead>}
              {!compact && <SortableHead column="ann" sort={sort} onSort={toggleSort}>Annual %</SortableHead>}
              {!compact && <SortableHead column="ret" sort={sort} onSort={toggleSort}>Return</SortableHead>}
              {!compact && <SortableHead column="comm" sort={sort} onSort={toggleSort}>Comm.</SortableHead>}
              {!compact && <SortableHead column="exec" sort={sort} onSort={toggleSort}>Exec</SortableHead>}
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedGroups.flatMap((group) => {
              const collapsed = Boolean(collapsedGroups[group.key])
              const rollup = computeGroupRollup(group.rows, metricsMap)

              const headerRow = (
                <TableRow
                  key={`group-header-${group.key}`}
                  className="bg-muted/30 hover:bg-muted/50 cursor-pointer"
                  onClick={() => toggleGroup(group.key)}
                >
                  <TableCell colSpan={2}>
                    <div className="flex items-center gap-2 font-semibold text-sm">
                      {collapsed
                        ? <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      }
                      <span>{group.label}</span>
                      <span className="text-xs text-muted-foreground font-normal">
                        ({group.rows.length} instance{group.rows.length !== 1 ? 's' : ''})
                      </span>
                    </div>
                  </TableCell>
                  <TableCell />
                  <TableCell />
                  <TableCell className={cn('text-right font-mono text-xs font-medium', pnlClass(rollup.totalNet))}>
                    {rollup.totalNet != null ? fmtUsd(rollup.totalNet) : '—'}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">—</TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {rollup.sumUnderlying != null ? fmtUsd(rollup.sumUnderlying) : '—'}
                  </TableCell>
                  <TableCell className={cn('text-right font-mono text-xs font-medium', pnlClass(rollup.groupAnnualPct))}>
                    {rollup.groupAnnualPct != null ? fmtPct(rollup.groupAnnualPct) : '—'}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">—</TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">—</TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">—</TableCell>
                  <TableCell />
                </TableRow>
              )

              if (collapsed) return [headerRow]

              const dataRows = group.rows.map((inst) => {
                const entry = metricsMap.get(inst.strategy_instance_id)
                const m = entry?.status === 'ready' ? entry.metrics : null
                const loading = !entry || entry.status === 'loading'

                return (
                  <TableRow
                    key={inst.strategy_instance_id}
                    className={cn(
                      activeDetailId === inst.strategy_instance_id && 'bg-primary/5',
                      compareId === inst.strategy_instance_id && 'bg-blue-500/5',
                    )}
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {inst.strategy_instance_id}
                    </TableCell>

                    <TableCell>
                      <div className="space-y-0.5">
                        <div className={cn('font-medium leading-tight', compact ? 'text-xs' : 'text-sm')}>
                          {inst.strategy_opportunity_name ?? '—'}
                        </div>
                        {inst.strategy_structure_name && (
                          <span
                            className="inline-block text-[10px] px-1.5 py-0.5 rounded font-medium border"
                            style={structureChipStyle(inst.strategy_structure_name, false)}
                          >
                            {inst.strategy_structure_name}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {!compact && (
                    <TableCell>
                      {loading ? (
                        <span className="text-xs text-muted-foreground">…</span>
                      ) : m ? (
                        <span className={cn(
                          'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                          'border',
                          m.tradeCount === 0
                            ? 'border-muted text-muted-foreground'
                            : 'border-green-500/40 text-green-600 dark:text-green-400',
                        )}>
                          {m.tradeCount === 0 ? 'No fills' : 'Open'}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    )}

                    {!compact && (
                    <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                      <span>{fmtDate(inst.opened_at)}</span>
                      {' '}
                      <span className="font-medium">{holdDaysDisplay(inst.opened_at)}</span>
                    </TableCell>
                    )}

                    {!compact && <TableCell className={cn('text-right font-mono text-xs font-medium', pnlClass(m?.netPnl))}>{loading ? '…' : fmtUsd(m?.netPnl)}</TableCell>}
                    {!compact && <TableCell className={cn('text-right font-mono text-xs', pnlClass(m?.netPnlPerDay))}>{loading ? '…' : fmtUsd(m?.netPnlPerDay)}</TableCell>}
                    {!compact && <TableCell className="text-right font-mono text-xs text-muted-foreground">{loading ? '…' : fmtUsd(m?.underlyingCost)}</TableCell>}
                    {!compact && <TableCell className={cn('text-right font-mono text-xs font-medium', pnlClass(m?.annualPct))}>{loading ? '…' : fmtPct(m?.annualPct)}</TableCell>}
                    {!compact && <TableCell className={cn('text-right font-mono text-xs', pnlClass(m?.returnPct))}>{loading ? '…' : fmtPct(m?.returnPct)}</TableCell>}
                    {!compact && <TableCell className="text-right font-mono text-xs text-muted-foreground">{loading ? '…' : m ? fmtUsd(-m.commission) : '—'}</TableCell>}
                    {!compact && <TableCell className="text-right text-xs">{inst.executions_count > 0 ? <span className="tabular-nums">{inst.executions_count}</span> : <span className="text-muted-foreground">0</span>}</TableCell>}

                    <TableCell className="p-1">
                      <div className="flex items-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn('h-7 w-7', activeDetailId === inst.strategy_instance_id ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}
                          title="View instance detail"
                          onClick={() => onViewDetail?.(inst)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {activeDetailId != null && activeDetailId !== inst.strategy_instance_id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn('h-7 w-7', compareId === inst.strategy_instance_id ? 'text-blue-500' : 'text-muted-foreground hover:text-foreground')}
                            title={compareId === inst.strategy_instance_id ? 'Remove comparison' : 'Compare side-by-side'}
                            onClick={() => onCompare?.(inst)}
                          >
                            <Columns2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => onDelete(inst)}
                          title="Delete instance"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })

              return [headerRow, ...dataRows]
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
