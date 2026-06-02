import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  IconActionButton,
  NestedDenseTable,
} from '@/components/data-display'
import { X } from 'lucide-react'
import type { StructureLeg, StrategyTemplateDetail, StructureTypeConfigOption } from '@/types/positions'
import { SaveFeedback } from '@/pages/strategy/optionCategory/SaveFeedback'
import {
  optionCategoryEmptyHintClass,
  optionCategorySectionActionsClass,
  optionCategorySectionBodyCompactClass,
  optionCategorySectionHeaderClass,
  optionCategorySectionTitleClass,
} from '@/pages/strategy/optionCategory/optionCategoryUi'
import {
  optionCategoryInlineInputQtyClass,
  optionCategoryInlineSelectDirClass,
  optionCategoryInlineSelectRightClass,
  optionCategoryInlineSelectRoleClass,
} from '@/pages/strategy/optionCategory/optionCategoryFormUi'

export interface OptionCategoryLegsSectionProps {
  detail: StrategyTemplateDetail
  legRoleOpts: StructureTypeConfigOption[]
  legDirOpts: StructureTypeConfigOption[]
  legOrOpts: StructureTypeConfigOption[]
  feedback: { section: string; ok: boolean } | null
  onDetailChange: (d: StrategyTemplateDetail) => void
  onSave: () => void
}

export function OptionCategoryLegsSection({
  detail,
  legRoleOpts,
  legDirOpts,
  legOrOpts,
  feedback,
  onDetailChange,
  onSave,
}: OptionCategoryLegsSectionProps) {
  const legs = detail.legs ?? []

  function updateLegs(next: StructureLeg[]) {
    onDetailChange({ ...detail, legs: next })
  }

  function addLeg() {
    updateLegs([
      ...legs,
      {
        role: 'call',
        direction: 'long',
        option_right: 'C',
        quantity: 1,
        strike: null,
        expiration: null,
      },
    ])
  }

  return (
    <Card variant="elevated">
      <div className={optionCategorySectionHeaderClass}>
        <h3 className={optionCategorySectionTitleClass}>Default Legs</h3>
        <div className={optionCategorySectionActionsClass}>
          <SaveFeedback section="legs" feedback={feedback} />
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={addLeg}>
            + Add leg
          </Button>
          <Button size="sm" className="h-7 text-xs" onClick={onSave}>
            Save
          </Button>
        </div>
      </div>
      {legs.length === 0 ? (
        <p className={cn(optionCategoryEmptyHintClass, 'px-4 py-6 text-center')}>
          No legs defined. Click &quot;Add leg&quot; to get started.
        </p>
      ) : (
        <div className={optionCategorySectionBodyCompactClass}>
          <NestedDenseTable>
            <DenseTableHeader>
              <DenseTableHeadRow>
                <DenseTableHead>Role</DenseTableHead>
                <DenseTableHead>Direction</DenseTableHead>
                <DenseTableHead>Right</DenseTableHead>
                <DenseTableHead className="text-right">Qty</DenseTableHead>
                <DenseTableHead className="w-8" />
              </DenseTableHeadRow>
            </DenseTableHeader>
            <DenseTableBody>
              {legs.map((leg: StructureLeg, i: number) => (
                <DenseTableRow key={i}>
                  <DenseTableCell>
                    <select
                      className={optionCategoryInlineSelectRoleClass}
                      value={leg.role ?? ''}
                      onChange={(e) => {
                        const next = [...legs]
                        next[i] = { ...next[i], role: e.target.value || null }
                        updateLegs(next)
                      }}
                    >
                      <option value="">—</option>
                      {legRoleOpts.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </DenseTableCell>
                  <DenseTableCell>
                    <select
                      className={optionCategoryInlineSelectDirClass}
                      value={leg.direction ?? ''}
                      onChange={(e) => {
                        const next = [...legs]
                        next[i] = { ...next[i], direction: e.target.value || null }
                        updateLegs(next)
                      }}
                    >
                      {legDirOpts.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </DenseTableCell>
                  <DenseTableCell>
                    <select
                      className={optionCategoryInlineSelectRightClass}
                      value={leg.option_right ?? ''}
                      onChange={(e) => {
                        const next = [...legs]
                        next[i] = { ...next[i], option_right: e.target.value || null }
                        updateLegs(next)
                      }}
                    >
                      {legOrOpts.map((o) => (
                        <option key={o.value || '_empty'} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </DenseTableCell>
                  <DenseTableCell className="text-right">
                    <Input
                      className={optionCategoryInlineInputQtyClass}
                      type="number"
                      min={1}
                      value={leg.quantity ?? 1}
                      onChange={(e) => {
                        const next = [...legs]
                        next[i] = { ...next[i], quantity: parseInt(e.target.value, 10) || 1 }
                        updateLegs(next)
                      }}
                    />
                  </DenseTableCell>
                  <DenseTableCell>
                    <IconActionButton
                      tone="danger"
                      title="Remove leg"
                      ariaLabel="Remove leg"
                      onClick={() => {
                        const next = [...legs]
                        next.splice(i, 1)
                        updateLegs(next)
                      }}
                    >
                      <X className="h-4 w-4" />
                    </IconActionButton>
                  </DenseTableCell>
                </DenseTableRow>
              ))}
            </DenseTableBody>
          </NestedDenseTable>
        </div>
      )}
    </Card>
  )
}
