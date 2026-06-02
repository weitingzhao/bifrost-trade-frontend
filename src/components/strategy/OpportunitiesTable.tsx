import { Copy, Pencil } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
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
import type { StrategyOpportunity } from '@/types/positions'
import { getScopeDisplay } from '@/utils/strategyFormUtils'
import {
  OPPORTUNITIES_TABLE_COL_WIDTHS,
  opportunitiesActionsCellClass,
  opportunitiesActionsInnerClass,
  opportunitiesMetaCellClass,
  opportunitiesNameCellClass,
  opportunitiesScopeCellClass,
  opportunitiesSwitchCellClass,
  opportunitiesTableClass,
} from '@/components/strategy/opportunities/opportunitiesUi'

export interface OpportunitiesTableProps {
  rows: StrategyOpportunity[]
  togglingIds: Set<number>
  copyLoadingId: number | null
  onToggle: (opp: StrategyOpportunity) => void
  onEdit: (opp: StrategyOpportunity) => void
  onCopy: (opp: StrategyOpportunity) => void
}

export function OpportunitiesTable({
  rows,
  togglingIds,
  copyLoadingId,
  onToggle,
  onEdit,
  onCopy,
}: OpportunitiesTableProps) {
  return (
    <DenseDataTable tableClassName={opportunitiesTableClass}>
      <colgroup>
        <col style={{ width: OPPORTUNITIES_TABLE_COL_WIDTHS.name }} />
        <col style={{ width: OPPORTUNITIES_TABLE_COL_WIDTHS.structure }} />
        <col style={{ width: OPPORTUNITIES_TABLE_COL_WIDTHS.scope }} />
        <col style={{ width: OPPORTUNITIES_TABLE_COL_WIDTHS.gate }} />
        <col style={{ width: OPPORTUNITIES_TABLE_COL_WIDTHS.available }} />
        <col style={{ width: OPPORTUNITIES_TABLE_COL_WIDTHS.actions }} />
      </colgroup>
      <DenseTableHeader>
        <DenseTableHeadRow>
          <DenseTableHead>Name</DenseTableHead>
          <DenseTableHead>Structure</DenseTableHead>
          <DenseTableHead>Scope</DenseTableHead>
          <DenseTableHead>Gate safety</DenseTableHead>
          <DenseTableHead className={opportunitiesSwitchCellClass}>Available</DenseTableHead>
          <DenseTableHead className={opportunitiesActionsCellClass} />
        </DenseTableHeadRow>
      </DenseTableHeader>
      <DenseTableBody>
        {rows.map((opp) => {
          const scopeDisplay = getScopeDisplay(opp.scope_type, opp.symbols)
          const copying = copyLoadingId === opp.strategy_opportunity_id
          return (
            <DenseTableRow key={opp.strategy_opportunity_id}>
              <DenseTableCell className={opportunitiesNameCellClass}>{opp.name}</DenseTableCell>
              <DenseTableCell className={opportunitiesMetaCellClass}>
                {opp.structure_name ?? opp.strategy_structure_id ?? '—'}
              </DenseTableCell>
              <DenseTableCell
                className={opportunitiesScopeCellClass}
                title={scopeDisplay.title || undefined}
              >
                {scopeDisplay.text}
              </DenseTableCell>
              <DenseTableCell className={opportunitiesMetaCellClass}>
                {opp.gate_safety_name ?? '—'}
              </DenseTableCell>
              <DenseTableCell className={opportunitiesSwitchCellClass}>
                <Switch
                  checked={opp.is_active}
                  disabled={togglingIds.size > 0}
                  onCheckedChange={() => onToggle(opp)}
                  aria-label={`Mark "${opp.name}" as ${opp.is_active ? 'unavailable' : 'available'}`}
                />
              </DenseTableCell>
              <DenseTableCell className={opportunitiesActionsCellClass}>
                <div className={opportunitiesActionsInnerClass}>
                  <IconActionButton
                    title="Edit opportunity"
                    ariaLabel={`Edit ${opp.name}`}
                    onClick={() => onEdit(opp)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </IconActionButton>
                  <IconActionButton
                    title="Copy opportunity"
                    ariaLabel={`Copy ${opp.name}`}
                    disabled={copying}
                    onClick={() => onCopy(opp)}
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
