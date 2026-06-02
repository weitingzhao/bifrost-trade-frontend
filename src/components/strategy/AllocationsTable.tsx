import { Pencil, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Switch } from '@/components/ui/switch'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  DenseTag,
  IconActionButton,
} from '@/components/data-display'
import type { StrategyAllocation } from '@/types/positions'
import {
  ALLOCATIONS_TABLE_COL_WIDTHS,
  allocationsActionsCellClass,
  allocationsActionsInnerClass,
  allocationsActiveRowClass,
  allocationsInactiveRowClass,
  allocationsMetaCellClass,
  allocationsNameCellClass,
  allocationsNumCellClass,
  allocationsOppTagsCellClass,
  allocationsSwitchCellClass,
  allocationsTableClass,
} from '@/components/strategy/allocations/allocationsUi'

export interface AllocationsTableProps {
  rows: StrategyAllocation[]
  oppNameMap: Record<number, string>
  activeAllocationId: number | null | undefined
  togglingId: number | null
  setActivePending: boolean
  onEdit: (id: number) => void
  onToggleActive: (row: StrategyAllocation, isActive: boolean) => void
  onSetActive: (id: number) => void
  onClearActive: () => void
}

export function AllocationsTable({
  rows,
  oppNameMap,
  activeAllocationId,
  togglingId,
  setActivePending,
  onEdit,
  onToggleActive,
  onSetActive,
  onClearActive,
}: AllocationsTableProps) {
  return (
    <DenseDataTable tableClassName={allocationsTableClass}>
      <colgroup>
        <col style={{ width: ALLOCATIONS_TABLE_COL_WIDTHS.name }} />
        <col style={{ width: ALLOCATIONS_TABLE_COL_WIDTHS.opportunities }} />
        <col style={{ width: ALLOCATIONS_TABLE_COL_WIDTHS.gateSafety }} />
        <col style={{ width: ALLOCATIONS_TABLE_COL_WIDTHS.maxPos }} />
        <col style={{ width: ALLOCATIONS_TABLE_COL_WIDTHS.maxBp }} />
        <col style={{ width: ALLOCATIONS_TABLE_COL_WIDTHS.available }} />
        <col style={{ width: ALLOCATIONS_TABLE_COL_WIDTHS.inUse }} />
        <col style={{ width: ALLOCATIONS_TABLE_COL_WIDTHS.actions }} />
      </colgroup>
      <DenseTableHeader>
        <DenseTableHeadRow>
          <DenseTableHead>Name</DenseTableHead>
          <DenseTableHead>Opportunities</DenseTableHead>
          <DenseTableHead>Gate safety</DenseTableHead>
          <DenseTableHead className={allocationsNumCellClass}>Max pos</DenseTableHead>
          <DenseTableHead className={allocationsNumCellClass}>Max BP%</DenseTableHead>
          <DenseTableHead className={allocationsSwitchCellClass}>Available</DenseTableHead>
          <DenseTableHead className={allocationsSwitchCellClass}>
            <span className="inline-flex items-center justify-center gap-1">
              In use
              <InfoTooltip text="Allocation selected for the daemon. Only one can be in use." />
            </span>
          </DenseTableHead>
          <DenseTableHead className={allocationsActionsCellClass} />
        </DenseTableHeadRow>
      </DenseTableHeader>
      <DenseTableBody>
        {rows.map((row) => {
          const isCurrentActive = activeAllocationId === row.strategy_allocation_id
          const availabilityUpdating = togglingId === row.strategy_allocation_id
          const gateLabel =
            row.gate_safety_name ??
            (row.gate_safety_strategy_id != null ? `#${row.gate_safety_strategy_id}` : '—')

          return (
            <DenseTableRow
              key={row.strategy_allocation_id}
              className={cn(
                row.is_active ? allocationsActiveRowClass : allocationsInactiveRowClass,
              )}
            >
              <DenseTableCell className={allocationsNameCellClass}>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                    {row.is_active && <Star className="h-3.5 w-3.5 text-yellow-500" />}
                  </span>
                  {row.name}
                </div>
              </DenseTableCell>
              <DenseTableCell>
                {row.strategy_opportunity_ids.length === 0 ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  <div className={allocationsOppTagsCellClass}>
                    {row.strategy_opportunity_ids.map((id) => (
                      <DenseTag key={id} variant="neutral" size="cell">
                        {oppNameMap[id] ?? `#${id}`}
                      </DenseTag>
                    ))}
                  </div>
                )}
              </DenseTableCell>
              <DenseTableCell className={allocationsMetaCellClass} title={gateLabel}>
                {gateLabel}
              </DenseTableCell>
              <DenseTableCell className={allocationsNumCellClass}>
                {row.max_positions ?? '—'}
              </DenseTableCell>
              <DenseTableCell className={allocationsNumCellClass}>
                {row.max_bp_pct != null ? `${(row.max_bp_pct * 100).toFixed(0)}%` : '—'}
              </DenseTableCell>
              <DenseTableCell className={allocationsSwitchCellClass}>
                <Switch
                  checked={row.is_active}
                  disabled={availabilityUpdating}
                  onCheckedChange={(checked) => onToggleActive(row, checked)}
                  aria-label={`Mark "${row.name}" as ${row.is_active ? 'unavailable' : 'available'}`}
                />
              </DenseTableCell>
              <DenseTableCell className={allocationsSwitchCellClass}>
                <Switch
                  checked={isCurrentActive}
                  disabled={setActivePending}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      onSetActive(row.strategy_allocation_id)
                    } else {
                      onClearActive()
                    }
                  }}
                  aria-label={`Use "${row.name}" as allocation in use by daemon`}
                />
              </DenseTableCell>
              <DenseTableCell className={allocationsActionsCellClass}>
                <div className={allocationsActionsInnerClass}>
                  <IconActionButton
                    title="Edit allocation"
                    ariaLabel={`Edit ${row.name}`}
                    onClick={() => onEdit(row.strategy_allocation_id)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </IconActionButton>
                </div>
              </DenseTableCell>
            </DenseTableRow>
          )
        })}
      </DenseTableBody>
    </DenseDataTable>
  )
}
