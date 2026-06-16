import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { IconActionButton } from '@/components/data-display'
import { X } from 'lucide-react'
import type { StrategyDimRow } from '@/types/positions'
import { DIM_TYPES, DIM_LABELS, DIM_ICONS, type DimType } from '@/pages/strategy/optionCategory/constants'
import {
  optionCategoryDimsDialogAddRowClass,
  optionCategoryDimsDialogGridClass,
  optionCategoryEmptyHintClass,
} from '@/pages/strategy/optionCategory/optionCategoryUi'
import {
  optionCategoryCompactSelectClass,
  optionCategoryDimsColumnTitleClass,
  optionCategoryMonoCodeClass,
} from '@/pages/strategy/optionCategory/optionCategoryFormUi'

export interface OptionCategoryDimensionsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dimsByType: Record<string, StrategyDimRow[]>
  newDimType: DimType
  newDimCode: string
  newDimLabel: string
  onNewDimTypeChange: (t: DimType) => void
  onNewDimCodeChange: (v: string) => void
  onNewDimLabelChange: (v: string) => void
  onAddDim: () => void
  onRequestDeleteDim: (row: StrategyDimRow) => void
}

export function OptionCategoryDimensionsDialog({
  open,
  onOpenChange,
  dimsByType,
  newDimType,
  newDimCode,
  newDimLabel,
  onNewDimTypeChange,
  onNewDimCodeChange,
  onNewDimLabelChange,
  onAddDim,
  onRequestDeleteDim,
}: OptionCategoryDimensionsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Dimension Values</DialogTitle>
        </DialogHeader>

        <div className={optionCategoryDimsDialogGridClass}>
          {DIM_TYPES.map((dt) => (
            <div key={dt}>
              <div className={optionCategoryDimsColumnTitleClass}>
                <span>{DIM_ICONS[dt]}</span> {DIM_LABELS[dt]}
              </div>
              {(dimsByType[dt] ?? []).length === 0 ? (
                <p className={optionCategoryEmptyHintClass + ' text-dense-caption italic'}>No values</p>
              ) : (
                <ul className="space-y-1">
                  {(dimsByType[dt] ?? []).map((row: StrategyDimRow) => (
                    <li key={row.strategy_dim_id} className="group flex items-center gap-1">
                      <code className={optionCategoryMonoCodeClass}>{row.code}</code>
                      <IconActionButton
                        tone="danger"
                        title={`Delete ${row.code}`}
                        ariaLabel={`Delete dimension value ${row.code}`}
                        className="shrink-0 opacity-0 group-hover:opacity-100"
                        onClick={() => onRequestDeleteDim(row)}
                      >
                        <X className="h-3 w-3" />
                      </IconActionButton>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        <div className={optionCategoryDimsDialogAddRowClass}>
          <Select value={newDimType} onValueChange={(v) => onNewDimTypeChange(v as DimType)}>
            <SelectTrigger className={optionCategoryCompactSelectClass + ' h-8'}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DIM_TYPES.map((dt) => (
                <SelectItem key={dt} value={dt}>
                  {DIM_LABELS[dt]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            className="h-8 w-28 text-xs"
            placeholder="code"
            value={newDimCode}
            onChange={(e) => onNewDimCodeChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onAddDim()
            }}
          />
          <Input
            className="h-8 flex-1 text-xs"
            placeholder="label"
            value={newDimLabel}
            onChange={(e) => onNewDimLabelChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onAddDim()
            }}
          />
          <Button size="sm" className="h-8 shrink-0" onClick={onAddDim} disabled={!newDimCode.trim()}>
            Add
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
