import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  DenseOptionCategoryLabel,
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
              <DenseTableCell className={opportunitiesNameCellClass}>
                <DenseOptionCategoryLabel variant="opportunity" className="whitespace-normal">
                  {opp.name}
                </DenseOptionCategoryLabel>
              </DenseTableCell>
              <DenseTableCell className={opportunitiesMetaCellClass}>
                {opp.structure_name?.trim() || opp.strategy_structure_id != null ? (
                  <DenseOptionCategoryLabel variant="structure" className="whitespace-normal">
                    {opp.structure_name?.trim() || String(opp.strategy_structure_id)}
                  </DenseOptionCategoryLabel>
                ) : (
                  '—'
                )}
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
                  disabled={togglingIds.has(opp.strategy_opportunity_id)}
                  onCheckedChange={() => onToggle(opp)}
                  aria-label={`Mark "${opp.name}" as ${opp.is_active ? 'unavailable' : 'available'}`}
                />
              </DenseTableCell>
              <DenseTableCell className={opportunitiesActionsCellClass}>
                <div className={opportunitiesActionsInnerClass}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => onEdit(opp)}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    disabled={copying}
                    onClick={() => onCopy(opp)}
                  >
                    {copying ? 'Copying…' : 'Copy'}
                  </Button>
                </div>
              </DenseTableCell>
            </DenseTableRow>
          )
        })}
      </DenseTableBody>
    </DenseDataTable>
  )
}
