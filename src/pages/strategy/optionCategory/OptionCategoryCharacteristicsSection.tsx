import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { StrategyTemplateDetail } from '@/types/positions'
import { SaveFeedback } from '@/pages/strategy/optionCategory/SaveFeedback'
import {
  optionCategorySectionActionsClass,
  optionCategorySectionBodyCompactClass,
  optionCategorySectionHeaderClass,
  optionCategorySectionTitleClass,
} from '@/pages/strategy/optionCategory/optionCategoryUi'
import { optionCategoryTextareaClass } from '@/pages/strategy/optionCategory/optionCategoryFormUi'

export interface OptionCategoryCharacteristicsSectionProps {
  detail: StrategyTemplateDetail
  feedback: { section: string; ok: boolean } | null
  onDetailChange: (d: StrategyTemplateDetail) => void
  onSave: () => void
}

export function OptionCategoryCharacteristicsSection({
  detail,
  feedback,
  onDetailChange,
  onSave,
}: OptionCategoryCharacteristicsSectionProps) {
  return (
    <Card variant="elevated">
      <div className={optionCategorySectionHeaderClass}>
        <h3 className={optionCategorySectionTitleClass}>Characteristics</h3>
        <div className={optionCategorySectionActionsClass}>
          <SaveFeedback section="chars" feedback={feedback} />
          <Button size="sm" className="h-7 text-xs" onClick={onSave}>
            Save
          </Button>
        </div>
      </div>
      <div className={optionCategorySectionBodyCompactClass}>
        <textarea
          className={optionCategoryTextareaClass}
          rows={6}
          placeholder="One characteristic per line…"
          value={(detail.characteristics ?? []).join('\n')}
          onChange={(e) =>
            onDetailChange({
              ...detail,
              characteristics: e.target.value.split('\n').filter(Boolean),
            })
          }
        />
      </div>
    </Card>
  )
}
