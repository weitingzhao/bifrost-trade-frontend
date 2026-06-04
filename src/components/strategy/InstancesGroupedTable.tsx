import { useState, useCallback, useMemo } from 'react'
import { ChevronRight, ChevronDown, Trash2, Eye, Columns2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fmtUsd, fmtUsdRound } from '@/lib/format'
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
import { pnlColorClass } from '@/utils/dailyChange'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  DenseTableSubheadRow,
  DenseOptionCategoryLabel,
  DenseTag,
  IconActionButton,
  denseTableNumCell,
} from '@/components/data-display'
import {
  instancesActionsCellClass,
  instancesActionsInnerClass,
  instancesColIdClass,
  instancesColOppClass,
  instancesColPeriodClass,
  instancesColStatusClass,
  instancesEmptyHintClass,
  instancesGroupMutedClass,
  instancesGroupToggleClass,
  instancesHeadGroupClass,
  instancesHeadSubClass,
  instancesOppCellClass,
  instancesOppNameClass,
  instancesPeriodDaysClass,
  instancesPeriodYearClass,
  instancesRowCompareClass,
  instancesRowSelectedClass,
  instancesSortBtnClass,
  instancesSortBtnNumClass,
  instancesSortCaretClass,
  instancesSortHeadActiveClass,
  instancesTableClass,
  INSTANCES_TABLE_COL_WIDTHS,
} from './instances/instancesUi'

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
  if (n == null || !Number.isFinite(n)) return 'text-muted-foreground'
  return pnlColorClass(n)
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

function SortableHead({
  column,
  sort,
  onSort,
  children,
  className,
  rowSpan,
  colSpan,
  scope,
  numeric,
}: {
  column: SortColumn
  sort: { column: SortColumn; dir: SortDir } | null
  onSort: (col: SortColumn) => void
  children: React.ReactNode
  className?: string
  rowSpan?: number
  colSpan?: number
  scope?: string
  numeric?: boolean
}) {
  const active = sort?.column === column
  return (
    <DenseTableHead
      rowSpan={rowSpan}
      colSpan={colSpan}
      scope={scope}
      align={numeric ? 'right' : 'left'}
      className={cn(className, active && instancesSortHeadActiveClass)}
      aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      onClick={() => onSort(column)}
    >
      <span className={cn(instancesSortBtnClass, numeric && instancesSortBtnNumClass)}>
        <span>{children}</span>
        {active ? (
          <span className={instancesSortCaretClass}>{sort!.dir === 'asc' ? '↑' : '↓'}</span>
        ) : null}
      </span>
    </DenseTableHead>
  )
}

function StatusChip({ status }: { status: 'open' | 'closed' | 'no_fills' }) {
  const label = status === 'open' ? 'Open' : status === 'closed' ? 'Closed' : 'No fills'
  const variant = status === 'open' ? 'success' : 'neutral'
  const title =
    status === 'closed'
      ? 'All contracts flat (buy and sell quantities net to zero per contract).'
      : status === 'open'
        ? 'At least one contract has non-zero net quantity.'
        : 'No fills attributed to this instance in the final book.'
  return (
    <DenseTag variant={variant} size="cell" title={title}>
      {label}
    </DenseTag>
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
      <DenseTableCell key={i} className={cn(denseTableNumCell, 'text-muted-foreground')}>…</DenseTableCell>
    ))
  }
  if (m.status === 'error') {
    return Array.from({ length: 9 }, (_, i) => (
      <DenseTableCell key={i} className={cn(denseTableNumCell, 'text-muted-foreground')}>—</DenseTableCell>
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
      <DenseTableCell>
        <StatusChip status={positionStatus} />
      </DenseTableCell>
      <DenseTableCell
        className={cn(instancesColPeriodClass, denseTableNumCell)}
        title={periodCell.title}
      >
        <span className={instancesPeriodYearClass}>{periodCell.yearLabel}</span>{' '}
        <span>{periodCell.rangeLabel}</span>{' '}
        {periodCell.dayLabel != null ? (
          <strong className={instancesPeriodDaysClass}>{periodCell.dayLabel}</strong>
        ) : null}
      </DenseTableCell>
      <DenseTableCell
        className={cn(denseTableNumCell, signedClass(execDerivedNetPnl))}
        title={linkSlipTitle}
      >
        {execDerivedNetPnl != null ? fmtUsd(execDerivedNetPnl) : '—'}
      </DenseTableCell>
      <DenseTableCell className={cn(denseTableNumCell, signedClass(npd))}>
        {npd != null ? fmtUsd(npd) : '—'}
      </DenseTableCell>
      <DenseTableCell className={cn(denseTableNumCell, 'text-muted-foreground')}>
        {underlying > 0 ? fmtUsdRound(underlying) : '—'}
      </DenseTableCell>
      <DenseTableCell className={cn(denseTableNumCell, 'text-muted-foreground')}>
        {costPerDay != null ? fmtUsdRound(costPerDay) : '—'}
      </DenseTableCell>
      <DenseTableCell className={cn(denseTableNumCell, signedClass(annual?.annualReturnPct))}>
        {annual != null ? fmtPct(annual.annualReturnPct) : '—'}
      </DenseTableCell>
      <DenseTableCell className={cn(denseTableNumCell, signedClass(returnPct))}>
        {returnPct != null ? fmtPct(returnPct) : '—'}
      </DenseTableCell>
      <DenseTableCell className={cn(denseTableNumCell, 'text-muted-foreground')}>
        {summary?.total_commission != null ? fmtUsd(-Number(summary.total_commission)) : '—'}
      </DenseTableCell>
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
    return <p className={instancesEmptyHintClass}>No instances found.</p>
  }

  return (
    <DenseDataTable wrapClassName="mt-1" tableClassName={instancesTableClass}>
      <colgroup>
        <col style={{ width: INSTANCES_TABLE_COL_WIDTHS.id }} />
        <col style={{ width: INSTANCES_TABLE_COL_WIDTHS.opp }} />
        <col style={{ width: INSTANCES_TABLE_COL_WIDTHS.status }} />
        <col style={{ width: INSTANCES_TABLE_COL_WIDTHS.period }} />
        <col style={{ width: INSTANCES_TABLE_COL_WIDTHS.net }} />
        <col style={{ width: INSTANCES_TABLE_COL_WIDTHS.npd }} />
        <col style={{ width: INSTANCES_TABLE_COL_WIDTHS.und }} />
        <col style={{ width: INSTANCES_TABLE_COL_WIDTHS.cday }} />
        <col style={{ width: INSTANCES_TABLE_COL_WIDTHS.ann }} />
        <col style={{ width: INSTANCES_TABLE_COL_WIDTHS.ret }} />
        <col style={{ width: INSTANCES_TABLE_COL_WIDTHS.comm }} />
        <col style={{ width: INSTANCES_TABLE_COL_WIDTHS.exec }} />
        <col style={{ width: INSTANCES_TABLE_COL_WIDTHS.actions }} />
      </colgroup>
      <DenseTableHeader>
        <DenseTableHeadRow>
          <DenseTableHead rowSpan={2} className={cn(instancesColIdClass, 'normal-case tracking-normal')}>
            ID
          </DenseTableHead>
          <DenseTableHead rowSpan={2} className={cn(instancesColOppClass, 'normal-case tracking-normal')}>
            Opportunity
          </DenseTableHead>
          <DenseTableHead rowSpan={2} className={cn(instancesColStatusClass, 'normal-case tracking-normal')}>
            Status
          </DenseTableHead>
          <SortableHead
            column="start"
            sort={sort}
            onSort={toggleSort}
            rowSpan={2}
            className={cn(instancesColPeriodClass, 'normal-case tracking-normal')}
          >
            <span title="Window: min report date → end (open: latest open-leg expiry; closed: max report date). Hold = calendar days for metrics.">
              Period
            </span>
          </SortableHead>
          <DenseTableHead colSpan={2} className={instancesHeadGroupClass} scope="colgroup">
            Net PnL
          </DenseTableHead>
          <DenseTableHead colSpan={2} className={instancesHeadGroupClass} scope="colgroup">
            Underlying Cost
          </DenseTableHead>
          <DenseTableHead colSpan={2} className={instancesHeadGroupClass} scope="colgroup">
            Return %
          </DenseTableHead>
          <SortableHead column="comm" sort={sort} onSort={toggleSort} rowSpan={2} numeric>
            <abbr title="Commission">Comm.</abbr>
          </SortableHead>
          <SortableHead column="exec" sort={sort} onSort={toggleSort} rowSpan={2} numeric>
            Exec
          </SortableHead>
          <DenseTableHead rowSpan={2} className={cn(instancesActionsCellClass, 'normal-case tracking-normal')}>
            Actions
          </DenseTableHead>
        </DenseTableHeadRow>
        <DenseTableHeadRow>
          <SortableHead column="net" sort={sort} onSort={toggleSort} className={instancesHeadSubClass} numeric>
            PnL
          </SortableHead>
          <SortableHead column="npd" sort={sort} onSort={toggleSort} className={instancesHeadSubClass} numeric>
            / day
          </SortableHead>
          <SortableHead column="und" sort={sort} onSort={toggleSort} className={instancesHeadSubClass} numeric>
            Cost
          </SortableHead>
          <SortableHead column="cday" sort={sort} onSort={toggleSort} className={instancesHeadSubClass} numeric>
            / day
          </SortableHead>
          <SortableHead column="ann" sort={sort} onSort={toggleSort} className={instancesHeadSubClass} numeric>
            <abbr title="Annualized return from Net/day ÷ Cost/day × 365.25/hold days.">Annual %</abbr>
          </SortableHead>
          <SortableHead column="ret" sort={sort} onSort={toggleSort} className={instancesHeadSubClass} numeric>
            <abbr title="Net PnL ÷ capital at risk × 100.">%</abbr>
          </SortableHead>
        </DenseTableHeadRow>
      </DenseTableHeader>
      <DenseTableBody>
        {sortedGroups.flatMap((group) => {
          const collapsed = Boolean(collapsedGroups[group.key])
          const rollup = computeSymbolGroupRollup(group.rows, metricsMap)

          const headerRow = (
            <DenseTableSubheadRow key={`group-${group.key}`}>
              <DenseTableCell colSpan={2}>
                <button
                  type="button"
                  className={instancesGroupToggleClass}
                  onClick={() => onToggleGroup(group.key)}
                  aria-expanded={!collapsed}
                >
                  {collapsed ? (
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span>
                    Symbol group: {group.label}
                    <span className={instancesGroupMutedClass}>
                      {' '}
                      ({group.rows.length} instance{group.rows.length !== 1 ? 's' : ''})
                    </span>
                  </span>
                </button>
              </DenseTableCell>
              <DenseTableCell className="text-muted-foreground">—</DenseTableCell>
              <DenseTableCell className="text-muted-foreground">—</DenseTableCell>
              <DenseTableCell
                className={cn(denseTableNumCell, signedClass(rollup.totalNet))}
                title="Sum of execution-derived Net PnL for instances with loaded metrics."
              >
                {rollup.totalNet != null ? fmtUsd(rollup.totalNet) : '—'}
              </DenseTableCell>
              <DenseTableCell className="text-muted-foreground">—</DenseTableCell>
              <DenseTableCell
                className={cn(
                  denseTableNumCell,
                  rollup.sumUnderlying != null ? '' : 'text-muted-foreground',
                )}
                title="Sum of per-instance underlying cost (sell-side OPT)."
              >
                {rollup.sumUnderlying != null ? fmtUsdRound(rollup.sumUnderlying) : '—'}
              </DenseTableCell>
              <DenseTableCell className="text-muted-foreground">—</DenseTableCell>
              <DenseTableCell
                className={cn(denseTableNumCell, signedClass(rollup.groupAnnualPct))}
                title="Group annual return: total Net × 365.25 / Σ(denominator × hold days) × 100."
              >
                {rollup.groupAnnualPct != null ? fmtPct(rollup.groupAnnualPct) : '—'}
              </DenseTableCell>
              <DenseTableCell className="text-muted-foreground">—</DenseTableCell>
              <DenseTableCell className="text-muted-foreground">—</DenseTableCell>
              <DenseTableCell className="text-muted-foreground">—</DenseTableCell>
              <DenseTableCell />
            </DenseTableSubheadRow>
          )

          if (collapsed) return [headerRow]

          const dataRows = group.rows.map((inst) => (
            <DenseTableRow
              key={inst.strategy_instance_id}
              className={cn(
                activeDetailId === inst.strategy_instance_id && instancesRowSelectedClass,
                compareId === inst.strategy_instance_id && instancesRowCompareClass,
              )}
            >
              <DenseTableCell className={cn(instancesColIdClass, denseTableNumCell, 'text-muted-foreground')}>
                {inst.strategy_instance_id}
              </DenseTableCell>
              <DenseTableCell className={instancesColOppClass}>
                <div className={instancesOppCellClass}>
                  <div
                    className={instancesOppNameClass}
                    title={inst.strategy_opportunity_name ?? undefined}
                  >
                    {inst.strategy_opportunity_name ?? '—'}
                  </div>
                  {inst.strategy_structure_name ? (
                    <DenseOptionCategoryLabel
                      variant="structure"
                      className="max-w-full whitespace-normal"
                      title={`Structure: ${inst.strategy_structure_name}`}
                    >
                      {inst.strategy_structure_name}
                    </DenseOptionCategoryLabel>
                  ) : null}
                </div>
              </DenseTableCell>
              <MetricsCells instanceId={inst.strategy_instance_id} metricsMap={metricsMap} />
              <DenseTableCell className={cn(denseTableNumCell, 'text-muted-foreground')}>
                {inst.executions_count != null ? inst.executions_count : '—'}
              </DenseTableCell>
              <DenseTableCell className={instancesActionsCellClass}>
                <div className={instancesActionsInnerClass}>
                  <IconActionButton
                    title="View instance detail"
                    ariaLabel="View instance detail"
                    onClick={() => onViewDetail?.(inst)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </IconActionButton>
                  {activeDetailId != null && activeDetailId !== inst.strategy_instance_id && (
                    <IconActionButton
                      title="Compare side-by-side"
                      ariaLabel="Compare side-by-side"
                      onClick={() => onCompare?.(inst)}
                    >
                      <Columns2 className="h-3.5 w-3.5" />
                    </IconActionButton>
                  )}
                  <IconActionButton
                    title="Delete instance"
                    ariaLabel="Delete instance"
                    tone="danger"
                    onClick={() => onDelete(inst)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </IconActionButton>
                </div>
              </DenseTableCell>
            </DenseTableRow>
          ))

          return [headerRow, ...dataRows]
        })}
      </DenseTableBody>
    </DenseDataTable>
  )
}
