import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import type { StrategyDimRow, StrategyTemplateDetail } from '@/types/positions'
import { DIM_TYPES, DIM_LABELS, DIM_ICONS } from '@/pages/strategy/optionCategory/constants'
import { SaveFeedback } from '@/pages/strategy/optionCategory/SaveFeedback'
import {
  optionCategorySectionActionsClass,
  optionCategorySectionBodyClass,
  optionCategorySectionHeaderClass,
  optionCategorySectionTitleClass,
} from '@/pages/strategy/optionCategory/optionCategoryUi'
import {
  optionCategoryCompactInputClass,
  optionCategoryCompactInputMonoClass,
  optionCategoryCompactSelectClass,
  optionCategoryDimGridClass,
  optionCategoryDimLabelClass,
  optionCategoryDimSectionLabelClass,
  optionCategoryFieldLabelClass,
  optionCategoryFormGridClass,
} from '@/pages/strategy/optionCategory/optionCategoryFormUi'

export interface OptionCategoryTemplateInfoSectionProps {
  detail: StrategyTemplateDetail
  dimsByType: Record<string, StrategyDimRow[]>
  feedback: { section: string; ok: boolean } | null
  onDetailChange: (d: StrategyTemplateDetail) => void
  onSave: () => void
  onDelete: () => void
}

export function OptionCategoryTemplateInfoSection({
  detail,
  dimsByType,
  feedback,
  onDetailChange,
  onSave,
  onDelete,
}: OptionCategoryTemplateInfoSectionProps) {
  return (
    <Card variant="elevated">
      <div className={optionCategorySectionHeaderClass}>
        <div className="flex items-center gap-2">
          <h2 className={optionCategorySectionTitleClass}>{detail.display_name}</h2>
          <Badge variant="outline" className="font-mono text-dense-caption">
            {detail.template_code}
          </Badge>
        </div>
        <div className={optionCategorySectionActionsClass}>
          <SaveFeedback section="info" feedback={feedback} />
          <Button size="sm" className="h-7 text-xs" onClick={onSave}>
            Save
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onDelete}>
            Delete
          </Button>
        </div>
      </div>
      <div className={cn(optionCategorySectionBodyClass, 'space-y-3')}>
        <div className={optionCategoryFormGridClass}>
          <div className="col-span-2">
            <Label className={optionCategoryFieldLabelClass}>Template code</Label>
            <Input
              className={optionCategoryCompactInputMonoClass}
              value={detail.template_code}
              onChange={(e) => onDetailChange({ ...detail, template_code: e.target.value })}
              spellCheck={false}
            />
          </div>
          <div className="col-span-2">
            <Label className={optionCategoryFieldLabelClass}>Display name</Label>
            <Input
              className={optionCategoryCompactInputClass}
              value={detail.display_name}
              onChange={(e) => onDetailChange({ ...detail, display_name: e.target.value })}
            />
          </div>
          <div>
            <Label className={optionCategoryFieldLabelClass}>Sort order</Label>
            <Input
              className={optionCategoryCompactInputClass}
              type="number"
              value={detail.sort_order}
              onChange={(e) =>
                onDetailChange({ ...detail, sort_order: parseInt(e.target.value, 10) || 0 })
              }
            />
          </div>
          <div className="flex items-end gap-2 pb-0.5">
            <Switch
              id="is-active"
              checked={detail.is_active}
              onCheckedChange={(v) => onDetailChange({ ...detail, is_active: v })}
            />
            <Label htmlFor="is-active" className="text-xs">
              Active
            </Label>
          </div>
        </div>

        <div className="mt-4">
          <p className={optionCategoryDimSectionLabelClass}>Six Dimensions</p>
          <div className={optionCategoryDimGridClass}>
            {DIM_TYPES.map((dt) => (
              <div key={dt}>
                <div className={optionCategoryDimLabelClass}>
                  <span>{DIM_ICONS[dt]}</span> {DIM_LABELS[dt]}
                </div>
                <Select
                  value={(detail[`dim_${dt}` as keyof StrategyTemplateDetail] as string | null) || '__empty__'}
                  onValueChange={(v) =>
                    onDetailChange({
                      ...detail,
                      [`dim_${dt}`]: v === '__empty__' ? null : v,
                    } as StrategyTemplateDetail)
                  }
                >
                  <SelectTrigger className={cn(optionCategoryCompactSelectClass, 'w-full')}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__empty__">—</SelectItem>
                    {(dimsByType[dt] ?? []).map((d: StrategyDimRow) => (
                      <SelectItem key={d.code} value={d.code}>
                        {d.display_label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}
