import { useState, useCallback, useMemo } from 'react'
import { ChevronRight, ChevronDown, Trash2, Eye, Columns2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { fmtUsd, fmtUsdRound } from '@/lib/format'
import { dangerGhostBtnClass } from '@/lib/uiClasses'
import { structureChipStyle } from '@/utils/structureColor'
import {
  computeInstancePositionStatus,
  computeSymbolGroupRollup,
  formatInstanceListPeriodCell,
  instanceListEndDateColumn,
  reportDateStartEnd,
  holdSpanDaysForMetrics,
  netPnlUsdPerDayFromNetAndExecutions,
  annualReturnDetailFromNetAndExecutions,
  underlyingCostSellOptUsd,
  computeCostPerDay,
  computeReturnPct,
  type InstanceListMetricsEntry,
} from '@/utils/instanceListMetrics'
import type { StrategyInstance } from '@/types/positions'
import styles from '@/pages/strategy/InstancesPage.module.css'

interface SymbolGroup {
  key: string
  label: string
  rows: StrategyInstance[]
}

type SortColumn =
  | 'start'
  | 'net'
  | 'npd'
  | 'und'
  | 'cday'
  | 'ann'
  | 'ret'
  | 'comm'
  | 'exec'
type SortDir = 'asc' | 'desc'

interface Props {
  groups: SymbolGroup[]
  metricsMap: Map<number, InstanceListMetricsEntry>
  detailViewMode: 'accordion' | 'multi'
  collapsedGroups: Record<string, boolean>
  onToggleGroup: (key: string) => void
  onDelete: (instance: StrategyInstance) => void
  onViewDetail?: (instance: StrategyInstance) => void
  onCompare?: (instance: StrategyInstance) => void
  activeDetailId?: number | null
  compareId?: number | null
}

function signedClass(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return styles.signedNeutral
  if (n > 1e-9) return styles.signedPositive
  if (n < -1e-9) return styles.signedNegative
  return styles.signedNeutral
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`
}

function getSortValue(
  row: StrategyInstance,
  m: InstanceListMetricsEntry | undefined,
  col: SortColumn,
): number {
  if (m == null || m.status !== 'ready') return NaN
  const { summary, sliced, execDerivedNetPnl, maxRiskUsd } = m
  const ps = computeInstancePositionStatus(sliced)
  switch (col) {
    case 'start': {
      const s = reportDateStartEnd(sliced).start
      if (s == null) return NaN
      const t = Date.parse(`${s}T12:00:00.000Z`)
      return Number.isFinite(t) ? t : NaN
    }
    case 'net':
      return execDerivedNetPnl != null && Number.isFinite(execDerivedNetPnl) ? execDerivedNetPnl : NaN
    case 'comm':
      return summary?.total_commission != null ? Number(summary.total_commission) : NaN
    case 'und': {
      const u = underlyingCostSellOptUsd(sliced)
      return Number.isFinite(u) ? u : NaN
    }
    case 'cday': {
      const v = computeCostPerDay(sliced, maxRiskUsd, ps)
      return v != null && Number.isFinite(v) ? v : NaN
    }
    case 'npd': {
      const v = netPnlUsdPerDayFromNetAndExecutions(execDerivedNetPnl, sliced, ps)
      return v != null && Number.isFinite(v) ? v : NaN
    }
    case 'ret': {
      const v = computeReturnPct(execDerivedNetPnl, sliced, maxRiskUsd)
      return v != null && Number.isFinite(v) ? v : NaN
    }
    case 'ann': {
      const a = annualReturnDetailFromNetAndExecutions(execDerivedNetPnl, sliced, maxRiskUsd, ps)
      return a != null && Number.isFinite(a.annualReturnPct) ? a.annualReturnPct : NaN
    }
    case 'exec': {
      const n = row.executions_count
      return n != null && Number.isFinite(Number(n)) ? Number(n) : NaN
    }
    default:
      return NaN
  }
}

function SortableTh({
  column,
  sort,
  onSort,
  children,
  className,
  rowSpan,
  numeric,
}: {
  column: SortColumn
  sort: { column: SortColumn; dir: SortDir } | null
  onSort: (col: SortColumn) => void
  children: React.ReactNode
  className?: string
  rowSpan?: number
  numeric?: boolean
}) {
  const active = sort?.column === column
  return (
    <th
      rowSpan={rowSpan}
      className={cn(className, numeric && styles.colNum, active && styles.thSortActive)}
      aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        className={cn(styles.thSortBtn, numeric && styles.thSortBtnNum)}
        onClick={() => onSort(column)}
        aria-pressed={active}
      >
        <span>{children}</span>
        {active ? <span className={styles.sortCaret}>{sort!.dir === 'asc' ? '↑' : '↓'}</span> : null}
      </button>
    </th>
  )
}

function StatusChip({ status }: { status: 'open' | 'closed' | 'no_fills' }) {
  const label = status === 'open' ? 'Open' : status === 'closed' ? 'Closed' : 'No fills'
  const cls =
    status === 'open'
      ? styles.statusOpen
      : status === 'closed'
        ? styles.statusClosed
        : styles.statusUnknown
  const title =
    status === 'closed'
      ? 'All contracts flat (buy and sell quantities net to zero per contract).'
      : status === 'open'
        ? 'At least one contract has non-zero net quantity.'
        : 'No fills attributed to this instance in the final book.'
  return (
    <span className={cn(styles.statusChip, cls)} title={title}>
      {label}
    </span>
  )
}

function MetricsCells({
  instanceId,
  metricsMap,
}: {
  instanceId: number
  metricsMap: Map<number, InstanceListMetricsEntry>
}) {
  const m = metricsMap.get(instanceId)
  if (m == null || m.status === 'loading') {
    return Array.from({ length: 9 }, (_, i) => (
      <td key={i} className={cn(styles.colNum, styles.signedNeutral)}>…</td>
    ))
  }
  if (m.status === 'error') {
    return Array.from({ length: 9 }, (_, i) => (
      <td key={i} className={cn(styles.colNum, styles.signedNeutral)}>—</td>
    ))
  }

  const { summary, sliced, execDerivedNetPnl, maxRiskUsd, linkedStockSlippage } = m
  const positionStatus = computeInstancePositionStatus(sliced)
  const { start } = reportDateStartEnd(sliced)
  const endCol = instanceListEndDateColumn(sliced, positionStatus)
  const holdSpanDays = holdSpanDaysForMetrics(sliced, positionStatus)
  const periodCell = formatInstanceListPeriodCell(start, endCol.display, holdSpanDays, endCol.cellTitle)
  const npd = netPnlUsdPerDayFromNetAndExecutions(execDerivedNetPnl, sliced, positionStatus)
  const annual = annualReturnDetailFromNetAndExecutions(execDerivedNetPnl, sliced, maxRiskUsd, positionStatus)
  const underlying = underlyingCostSellOptUsd(sliced)
  const costPerDay = computeCostPerDay(sliced, maxRiskUsd, positionStatus)
  const returnPct = computeReturnPct(execDerivedNetPnl, sliced, maxRiskUsd)
  const linkSlipTitle =
    Math.abs(linkedStockSlippage) > 1e-9
      ? `Includes prorated option–stock link slippage (${fmtUsd(linkedStockSlippage)}).`
      : undefined

  return (
    <>
      <td>
        <StatusChip status={positionStatus} />
      </td>
      <td className={cn(styles.colPeriod, styles.colNum)} title={periodCell.title}>
        <span className={styles.periodYear}>{periodCell.yearLabel}</span>{' '}
        <span>{periodCell.rangeLabel}</span>{' '}
        {periodCell.dayLabel != null ? (
          <strong className={styles.periodDays}>{periodCell.dayLabel}</strong>
        ) : null}
      </td>
      <td
        className={cn(styles.colNum, signedClass(execDerivedNetPnl))}
        title={linkSlipTitle}
      >
        {execDerivedNetPnl != null ? fmtUsd(execDerivedNetPnl) : '—'}
      </td>
      <td className={cn(styles.colNum, signedClass(npd))}>
        {npd != null ? fmtUsd(npd) : '—'}
      </td>
      <td className={cn(styles.colNum, styles.signedNeutral)}>
        {underlying > 0 ? fmtUsdRound(underlying) : '—'}
      </td>
      <td className={cn(styles.colNum, styles.signedNeutral)}>
        {costPerDay != null ? fmtUsdRound(costPerDay) : '—'}
      </td>
      <td className={cn(styles.colNum, signedClass(annual?.annualReturnPct))}>
        {annual != null ? fmtPct(annual.annualReturnPct) : '—'}
      </td>
      <td className={cn(styles.colNum, signedClass(returnPct))}>
        {returnPct != null ? fmtPct(returnPct) : '—'}
      </td>
      <td className={cn(styles.colNum, styles.signedNeutral)}>
        {summary?.total_commission != null ? fmtUsd(-Number(summary.total_commission)) : '—'}
      </td>
    </>
  )
}

export function InstancesGroupedTable({
  groups,
  metricsMap,
  collapsedGroups,
  onToggleGroup,
  onDelete,
  onViewDetail,
  onCompare,
  activeDetailId,
  compareId,
}: Props) {
  const [sort, setSort] = useState<{ column: SortColumn; dir: SortDir } | null>(null)

  const toggleSort = useCallback((col: SortColumn) => {
    setSort((prev) => {
      if (prev?.column !== col) return { column: col, dir: 'desc' }
      return { column: col, dir: prev.dir === 'desc' ? 'asc' : 'desc' }
    })
  }, [])

  const sortedGroups = useMemo(() => {
    if (!sort) return groups
    return groups.map((g) => ({
      ...g,
      rows: [...g.rows].sort((a, b) => {
        const va = getSortValue(a, metricsMap.get(a.strategy_instance_id), sort.column)
        const vb = getSortValue(b, metricsMap.get(b.strategy_instance_id), sort.column)
        const mul = sort.dir === 'asc' ? 1 : -1
        if (Number.isNaN(va) && Number.isNaN(vb)) return a.strategy_instance_id - b.strategy_instance_id
        if (Number.isNaN(va)) return 1
        if (Number.isNaN(vb)) return -1
        if (va === vb) return a.strategy_instance_id - b.strategy_instance_id
        return va < vb ? -mul : mul
      }),
    }))
  }, [groups, sort, metricsMap])

  if (groups.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">No instances found.</p>
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.instancesTable}>
        <thead>
          <tr>
            <th rowSpan={2}>ID</th>
            <th rowSpan={2} className={styles.colOpp}>Opportunity</th>
            <th rowSpan={2}>Status</th>
            <SortableTh column="start" sort={sort} onSort={toggleSort} rowSpan={2} className={styles.colPeriod}>
              <span title="Window: min report date → end (open: latest open-leg expiry; closed: max report date). Hold = calendar days for metrics.">
                Period
              </span>
            </SortableTh>
            <th colSpan={2} className={styles.headGroup} scope="colgroup">Net PnL</th>
            <th colSpan={2} className={styles.headGroup} scope="colgroup">Underlying Cost</th>
            <th colSpan={2} className={styles.headGroup} scope="colgroup">Return %</th>
            <SortableTh column="comm" sort={sort} onSort={toggleSort} rowSpan={2} numeric>
              <abbr title="Commission">Comm.</abbr>
            </SortableTh>
            <SortableTh column="exec" sort={sort} onSort={toggleSort} rowSpan={2} numeric>
              Exec
            </SortableTh>
            <th rowSpan={2} className={styles.actionsCell}>Actions</th>
          </tr>
          <tr>
            <SortableTh column="net" sort={sort} onSort={toggleSort} className={styles.headSub} numeric>
              PnL
            </SortableTh>
            <SortableTh column="npd" sort={sort} onSort={toggleSort} className={styles.headSub} numeric>
              / day
            </SortableTh>
            <SortableTh column="und" sort={sort} onSort={toggleSort} className={styles.headSub} numeric>
              Cost
            </SortableTh>
            <SortableTh column="cday" sort={sort} onSort={toggleSort} className={styles.headSub} numeric>
              / day
            </SortableTh>
            <SortableTh column="ann" sort={sort} onSort={toggleSort} className={styles.headSub} numeric>
              <abbr title="Annualized return from Net/day ÷ Cost/day × 365.25/hold days.">Annual %</abbr>
            </SortableTh>
            <SortableTh column="ret" sort={sort} onSort={toggleSort} className={styles.headSub} numeric>
              <abbr title="Net PnL ÷ capital at risk × 100.">%</abbr>
            </SortableTh>
          </tr>
        </thead>
        <tbody>
          {sortedGroups.flatMap((group) => {
            const collapsed = Boolean(collapsedGroups[group.key])
            const rollup = computeSymbolGroupRollup(group.rows, metricsMap)

            const headerRow = (
              <tr key={`group-${group.key}`} className={styles.groupRow}>
                <td colSpan={2}>
                  <button
                    type="button"
                    className={styles.groupToggle}
                    onClick={() => onToggleGroup(group.key)}
                    aria-expanded={!collapsed}
                  >
                    {collapsed ? (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span>
                      Symbol group: {group.label}
                      <span className={styles.groupMuted}>
                        {' '}
                        ({group.rows.length} instance{group.rows.length !== 1 ? 's' : ''})
                      </span>
                    </span>
                  </button>
                </td>
                <td className={styles.signedNeutral}>—</td>
                <td className={styles.signedNeutral}>—</td>
                <td
                  className={cn(styles.colNum, signedClass(rollup.totalNet))}
                  title="Sum of execution-derived Net PnL for instances with loaded metrics."
                >
                  {rollup.totalNet != null ? fmtUsd(rollup.totalNet) : '—'}
                </td>
                <td className={styles.signedNeutral}>—</td>
                <td
                  className={cn(styles.colNum, rollup.sumUnderlying != null ? '' : styles.signedNeutral)}
                  title="Sum of per-instance underlying cost (sell-side OPT)."
                >
                  {rollup.sumUnderlying != null ? fmtUsdRound(rollup.sumUnderlying) : '—'}
                </td>
                <td className={styles.signedNeutral}>—</td>
                <td
                  className={cn(styles.colNum, signedClass(rollup.groupAnnualPct))}
                  title="Group annual return: total Net × 365.25 / Σ(denominator × hold days) × 100."
                >
                  {rollup.groupAnnualPct != null ? fmtPct(rollup.groupAnnualPct) : '—'}
                </td>
                <td className={styles.signedNeutral}>—</td>
                <td className={styles.signedNeutral}>—</td>
                <td className={styles.signedNeutral}>—</td>
                <td />
              </tr>
            )

            if (collapsed) return [headerRow]

            const dataRows = group.rows.map((inst) => (
              <tr
                key={inst.strategy_instance_id}
                className={cn(
                  activeDetailId === inst.strategy_instance_id && styles.rowSelected,
                  compareId === inst.strategy_instance_id && 'bg-blue-500/5',
                )}
              >
                <td className={cn(styles.colNum, styles.signedNeutral)}>{inst.strategy_instance_id}</td>
                <td className={styles.colOpp}>
                  <div>{inst.strategy_opportunity_name ?? '—'}</div>
                  {inst.strategy_structure_name ? (
                    <span
                      className={styles.structureChip}
                      style={structureChipStyle(inst.strategy_structure_name, false)}
                      title={`Structure: ${inst.strategy_structure_name}`}
                    >
                      {inst.strategy_structure_name}
                    </span>
                  ) : null}
                </td>
                <MetricsCells instanceId={inst.strategy_instance_id} metricsMap={metricsMap} />
                <td className={cn(styles.colNum, styles.signedNeutral)}>
                  {inst.executions_count != null ? inst.executions_count : '—'}
                </td>
                <td className={styles.actionsCell}>
                  <div className={styles.actionsInner}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="View instance detail"
                      onClick={() => onViewDetail?.(inst)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    {activeDetailId != null && activeDetailId !== inst.strategy_instance_id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Compare side-by-side"
                        onClick={() => onCompare?.(inst)}
                      >
                        <Columns2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn('h-7 w-7', dangerGhostBtnClass)}
                      title="Delete instance"
                      onClick={() => onDelete(inst)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))

            return [headerRow, ...dataRows]
          })}
        </tbody>
      </table>
    </div>
  )
}
