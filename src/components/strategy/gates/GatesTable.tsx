import { Copy, Pencil, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
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
import type { GateSafetyItem } from '@/types/positions'
import {
  GATES_TABLE_COL_WIDTHS,
  gatesActionsCellClass,
  gatesActionsInnerClass,
  gatesActiveCellClass,
  gatesDimensionsCellClass,
  gatesIdCellClass,
  gatesNameCellClass,
  gatesTableClass,
  gatesVersionClass,
} from '@/components/strategy/gates/gatesUi'

function dimCells(item: GateSafetyItem): string {
  const vals = [
    item.dim_direction,
    item.dim_structure,
    item.dim_coverage,
    item.dim_risk,
    item.dim_volatility,
    item.dim_time,
  ].filter(Boolean) as string[]
  return vals.length > 0 ? vals.join(' · ') : '—'
}

export interface GatesTableProps {
  items: GateSafetyItem[]
  activeGateId: number | null | undefined
  setActivePending: boolean
  onEdit: (id: number) => void
  onCopy: (id: number) => void
  onSetActive: (item: GateSafetyItem) => void
}

export function GatesTable({
  items,
  activeGateId,
  setActivePending,
  onEdit,
  onCopy,
  onSetActive,
}: GatesTableProps) {
  return (
    <DenseDataTable tableClassName={gatesTableClass}>
      <colgroup>
        <col style={{ width: GATES_TABLE_COL_WIDTHS.id }} />
        <col style={{ width: GATES_TABLE_COL_WIDTHS.name }} />
        <col style={{ width: GATES_TABLE_COL_WIDTHS.version }} />
        <col style={{ width: GATES_TABLE_COL_WIDTHS.dimensions }} />
        <col style={{ width: GATES_TABLE_COL_WIDTHS.active }} />
        <col style={{ width: GATES_TABLE_COL_WIDTHS.actions }} />
      </colgroup>
      <DenseTableHeader>
        <DenseTableHeadRow>
          <DenseTableHead>ID</DenseTableHead>
          <DenseTableHead>Name</DenseTableHead>
          <DenseTableHead className="text-right">Ver</DenseTableHead>
          <DenseTableHead>Dimensions</DenseTableHead>
          <DenseTableHead className={gatesActiveCellClass}>Active</DenseTableHead>
          <DenseTableHead className={gatesActionsCellClass} />
        </DenseTableHeadRow>
      </DenseTableHeader>
      <DenseTableBody>
        {items.map((item) => {
          const isDaemonActive = activeGateId === item.gate_safety_strategy_id
          const dims = dimCells(item)
          return (
            <DenseTableRow key={item.gate_safety_strategy_id}>
              <DenseTableCell className={gatesIdCellClass}>
                #{item.gate_safety_strategy_id}
              </DenseTableCell>
              <DenseTableCell className={gatesNameCellClass}>{item.name}</DenseTableCell>
              <DenseTableCell className="text-right">
                <span className={gatesVersionClass} aria-label={`Version ${item.version}`}>
                  v{item.version}
                </span>
              </DenseTableCell>
              <DenseTableCell className={gatesDimensionsCellClass} title={dims}>
                {dims}
              </DenseTableCell>
              <DenseTableCell className={gatesActiveCellClass}>
                {isDaemonActive ? (
                  <DenseTag variant="success">Active</DenseTag>
                ) : item.is_active ? (
                  <DenseTag variant="neutral">Available</DenseTag>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </DenseTableCell>
              <DenseTableCell className={gatesActionsCellClass}>
                <div className={gatesActionsInnerClass}>
                  <IconActionButton
                    title="Edit gate set"
                    ariaLabel={`Edit ${item.name}`}
                    onClick={() => onEdit(item.gate_safety_strategy_id)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </IconActionButton>
                  <IconActionButton
                    title="Copy gate set"
                    ariaLabel={`Copy ${item.name}`}
                    onClick={() => onCopy(item.gate_safety_strategy_id)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </IconActionButton>
                  <IconActionButton
                    title={isDaemonActive ? 'Currently active for daemon' : 'Set active for daemon'}
                    ariaLabel={
                      isDaemonActive
                        ? `${item.name} is active`
                        : `Set ${item.name} as active gate safety`
                    }
                    tone={isDaemonActive ? 'warn' : 'default'}
                    disabled={isDaemonActive || setActivePending}
                    onClick={() => onSetActive(item)}
                  >
                    <Star className={cn('h-3.5 w-3.5', isDaemonActive && 'fill-current')} />
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
