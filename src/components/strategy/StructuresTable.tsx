import { Copy, Pencil } from 'lucide-react'
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
  IconActionButton,
} from '@/components/data-display'
import type { StrategyStructure } from '@/types/strategy'
import {
  getStructureDisplayLabel,
  summarizeConstraints,
  summarizeDimensions,
  summarizeLegs,
} from '@/utils/strategyFormUtils'
import {
  STRUCTURES_TABLE_COL_WIDTHS,
  structuresActionsCellClass,
  structuresActionsInnerClass,
  structuresInactiveRowClass,
  structuresNameCellClass,
  structuresSummaryCellClass,
  structuresSwitchCellClass,
  structuresTableClass,
  structuresTemplateCellClass,
  structuresVersionClass,
} from '@/components/strategy/structures/structuresUi'

export interface StructuresTableProps {
  rows: StrategyStructure[]
  activeStructureId: number | null | undefined
  availabilityUpdatingId: number | null
  setActivePending: boolean
  updatePending: boolean
  onToggleAvailability: (row: StrategyStructure) => void
  onSetActive: (structureId: number) => void
  onClearActive: () => void
  onEdit: (structureId: number) => void
  onCopy: (structureId: number) => void
}

export function StructuresTable({
  rows,
  activeStructureId,
  availabilityUpdatingId,
  setActivePending,
  updatePending,
  onToggleAvailability,
  onSetActive,
  onClearActive,
  onEdit,
  onCopy,
}: StructuresTableProps) {
  return (
    <DenseDataTable tableClassName={structuresTableClass}>
      <colgroup>
        <col style={{ width: STRUCTURES_TABLE_COL_WIDTHS.name }} />
        <col style={{ width: STRUCTURES_TABLE_COL_WIDTHS.template }} />
        <col style={{ width: STRUCTURES_TABLE_COL_WIDTHS.dimensions }} />
        <col style={{ width: STRUCTURES_TABLE_COL_WIDTHS.legs }} />
        <col style={{ width: STRUCTURES_TABLE_COL_WIDTHS.constraints }} />
        <col style={{ width: STRUCTURES_TABLE_COL_WIDTHS.available }} />
        <col style={{ width: STRUCTURES_TABLE_COL_WIDTHS.inUse }} />
        <col style={{ width: STRUCTURES_TABLE_COL_WIDTHS.actions }} />
      </colgroup>
      <DenseTableHeader>
        <DenseTableHeadRow>
          <DenseTableHead>Name</DenseTableHead>
          <DenseTableHead>Template</DenseTableHead>
          <DenseTableHead>Dimensions</DenseTableHead>
          <DenseTableHead>Legs</DenseTableHead>
          <DenseTableHead>Constraints</DenseTableHead>
          <DenseTableHead className={structuresSwitchCellClass}>Available</DenseTableHead>
          <DenseTableHead className={structuresSwitchCellClass}>
            <span className="inline-flex items-center justify-center gap-1">
              In use
              <InfoTooltip text="Structure selected for the daemon. Only one can be in use." />
            </span>
          </DenseTableHead>
          <DenseTableHead className={structuresActionsCellClass} />
        </DenseTableHeadRow>
      </DenseTableHeader>
      <DenseTableBody>
        {rows.map((row) => {
          const isCurrentActive = activeStructureId === row.strategy_structure_id
          const availabilityUpdating = availabilityUpdatingId === row.strategy_structure_id
          return (
            <DenseTableRow
              key={row.strategy_structure_id}
              className={cn(!row.is_active && structuresInactiveRowClass)}
            >
              <DenseTableCell className={structuresNameCellClass}>
                {row.name}
                {row.version != null && (
                  <span className={structuresVersionClass} aria-label={`Version ${row.version}`}>
                    v{row.version}
                  </span>
                )}
              </DenseTableCell>
              <DenseTableCell className={structuresTemplateCellClass}>
                {getStructureDisplayLabel(row)}
              </DenseTableCell>
              <DenseTableCell className={structuresSummaryCellClass} title={summarizeDimensions(row)}>
                {summarizeDimensions(row)}
              </DenseTableCell>
              <DenseTableCell className={structuresSummaryCellClass} title={summarizeLegs(row.legs)}>
                {summarizeLegs(row.legs)}
              </DenseTableCell>
              <DenseTableCell
                className={structuresSummaryCellClass}
                title={summarizeConstraints(row.constraints)}
              >
                {summarizeConstraints(row.constraints)}
              </DenseTableCell>
              <DenseTableCell className={structuresSwitchCellClass}>
                <Switch
                  checked={row.is_active}
                  disabled={availabilityUpdating || updatePending}
                  onCheckedChange={() => onToggleAvailability(row)}
                  aria-label={`Mark "${row.name}" as ${row.is_active ? 'unavailable' : 'available'}`}
                />
              </DenseTableCell>
              <DenseTableCell className={structuresSwitchCellClass}>
                <Switch
                  checked={isCurrentActive}
                  disabled={setActivePending}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      onSetActive(row.strategy_structure_id)
                    } else {
                      onClearActive()
                    }
                  }}
                  aria-label={`Use "${row.name}" as structure in use by daemon`}
                />
              </DenseTableCell>
              <DenseTableCell className={structuresActionsCellClass}>
                <div className={structuresActionsInnerClass}>
                  <IconActionButton
                    title="Edit structure"
                    ariaLabel={`Edit ${row.name}`}
                    onClick={() => onEdit(row.strategy_structure_id)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </IconActionButton>
                  <IconActionButton
                    title="Copy structure"
                    ariaLabel={`Copy ${row.name}`}
                    onClick={() => onCopy(row.strategy_structure_id)}
                  >
                    <Copy className="h-3.5 w-3.5" />
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
