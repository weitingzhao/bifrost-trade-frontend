import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  optionCategoryLegsTableClass,
  optionCategoryTableCellSelectClass,
} from '@/pages/strategy/optionCategory/optionCategoryFormUi'
import { OptionCategoryLegsColgroup } from '@/pages/strategy/optionCategory/optionCategoryTableColgroups'

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
          <NestedDenseTable tableClassName={optionCategoryLegsTableClass}>
            <OptionCategoryLegsColgroup />
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
                  <DenseTableCell className={optionCategoryTableCellSelectClass}>
                    <Select
                      value={leg.role || '__empty__'}
                      onValueChange={(v) => {
                        const next = [...legs]
                        next[i] = { ...next[i], role: v === '__empty__' ? null : v }
                        updateLegs(next)
                      }}
                    >
                      <SelectTrigger className={optionCategoryInlineSelectRoleClass}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__empty__">—</SelectItem>
                        {legRoleOpts.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </DenseTableCell>
                  <DenseTableCell className={optionCategoryTableCellSelectClass}>
                    <Select
                      value={leg.direction || legDirOpts[0]?.value || ''}
                      onValueChange={(v) => {
                        const next = [...legs]
                        next[i] = { ...next[i], direction: v || null }
                        updateLegs(next)
                      }}
                    >
                      <SelectTrigger className={optionCategoryInlineSelectDirClass}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {legDirOpts.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </DenseTableCell>
                  <DenseTableCell className={optionCategoryTableCellSelectClass}>
                    <Select
                      value={leg.option_right || '__empty__'}
                      onValueChange={(v) => {
                        const next = [...legs]
                        next[i] = { ...next[i], option_right: v === '__empty__' ? null : v }
                        updateLegs(next)
                      }}
                    >
                      <SelectTrigger className={optionCategoryInlineSelectRightClass}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {legOrOpts.map((o) => (
                          <SelectItem key={o.value || '__empty__'} value={o.value || '__empty__'}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
