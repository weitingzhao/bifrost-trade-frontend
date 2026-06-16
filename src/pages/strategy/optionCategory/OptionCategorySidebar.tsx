import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { GripVertical, LayoutGrid, Search, X } from 'lucide-react'
import type { StrategyTemplateRow } from '@/types/positions'
import { DIM_TYPES, DIM_LABELS, DIM_ICONS, type DimType } from '@/pages/strategy/optionCategory/constants'
import type { StrategyDimRow } from '@/types/positions'
import {
  optionCategoryReorderHintClass,
  optionCategorySaveFeedbackClass,
  optionCategorySidebarClass,
  optionCategorySidebarCountClass,
  optionCategorySidebarDragClass,
  optionCategorySidebarItemBtnClass,
  optionCategorySidebarItemSelectedClass,
  optionCategorySidebarListClass,
  optionCategorySidebarRowClass,
  optionCategorySidebarSearchClass,
} from '@/pages/strategy/optionCategory/optionCategoryUi'

export interface OptionCategorySidebarProps {
  searchText: string
  onSearchTextChange: (v: string) => void
  dimFilters: Partial<Record<DimType, string>>
  onDimFiltersChange: (next: Partial<Record<DimType, string>>) => void
  filtersOpen: boolean
  onFiltersOpenToggle: () => void
  activeDimFilterCount: number
  hasFilter: boolean
  filteredCount: number
  totalCount: number
  sidebarTemplates: StrategyTemplateRow[]
  dimsByType: Record<string, StrategyDimRow[]>
  selectedId: number | null
  onSelectId: (id: number) => void
  dragId: number | null
  onDragIdChange: (id: number | null) => void
  onReorder: (draggedId: number, targetId: number) => void
  reorderFeedback: { section: string; ok: boolean } | null
}

export function OptionCategorySidebar({
  searchText,
  onSearchTextChange,
  dimFilters,
  onDimFiltersChange,
  filtersOpen,
  onFiltersOpenToggle,
  activeDimFilterCount,
  hasFilter,
  filteredCount,
  totalCount,
  sidebarTemplates,
  dimsByType,
  selectedId,
  onSelectId,
  dragId,
  onDragIdChange,
  onReorder,
  reorderFeedback,
}: OptionCategorySidebarProps) {
  return (
    <aside className={optionCategorySidebarClass}>
      <div className={optionCategorySidebarSearchClass}>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-7 pl-7 text-xs"
            placeholder="Search templates…"
            value={searchText}
            onChange={(e) => onSearchTextChange(e.target.value)}
          />
          {searchText ? (
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2"
              onClick={() => onSearchTextChange('')}
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          ) : null}
        </div>

        <div className="flex items-center justify-between">
          <span className={optionCategorySidebarCountClass}>
            {hasFilter ? `${filteredCount} / ${totalCount}` : `${totalCount}`} templates
            {reorderFeedback?.section === 'reorder' ? (
              <span className={cn(optionCategoryReorderHintClass, optionCategorySaveFeedbackClass(reorderFeedback.ok))}>
                {reorderFeedback.ok ? '✓ reordered' : '✗ failed'}
              </span>
            ) : null}
          </span>
          <Button
            variant={activeDimFilterCount > 0 ? 'default' : 'ghost'}
            size="sm"
            className="h-6 px-2 text-[10px]"
            onClick={onFiltersOpenToggle}
          >
            <LayoutGrid className="mr-1 h-3 w-3" />
            {activeDimFilterCount > 0 ? `${activeDimFilterCount} filter` : 'Filter'}
          </Button>
        </div>

        {filtersOpen ? (
          <div className="space-y-1.5 pt-1">
            {DIM_TYPES.map((dt) => (
              <div key={dt} className="flex items-center gap-2">
                <span className="w-5 text-center text-sm" title={DIM_LABELS[dt]}>
                  {DIM_ICONS[dt]}
                </span>
                <Select
                  value={dimFilters[dt] ?? '__all__'}
                  onValueChange={(v) => {
                    const next = { ...dimFilters }
                    if (v !== '__all__') next[dt] = v
                    else delete next[dt]
                    onDimFiltersChange(next)
                  }}
                >
                  <SelectTrigger className="h-6 flex-1 text-[10px] px-1">
                    <SelectValue placeholder={`All ${DIM_LABELS[dt]}`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All {DIM_LABELS[dt]}</SelectItem>
                    {(dimsByType[dt] ?? []).map((d: StrategyDimRow) => (
                      <SelectItem key={d.code} value={d.code}>
                        {d.display_label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
            {activeDimFilterCount > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-full text-xs"
                onClick={() => onDimFiltersChange({})}
              >
                Clear filters
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      <ul className={optionCategorySidebarListClass}>
        {hasFilter && sidebarTemplates.length === 0 ? (
          <li className={cn(optionCategorySidebarCountClass, 'py-4 text-center')}>No matches</li>
        ) : null}
        {sidebarTemplates.map((t) => (
          <li
            key={t.strategy_template_id}
            className={cn(
              optionCategorySidebarRowClass,
              dragId === t.strategy_template_id && 'opacity-40',
            )}
            onDragOver={
              hasFilter
                ? undefined
                : (e) => {
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                  }
            }
            onDrop={
              hasFilter
                ? undefined
                : (e) => {
                    e.preventDefault()
                    const id = parseInt(e.dataTransfer.getData('application/x-tpl-id'), 10)
                    if (!Number.isNaN(id)) onReorder(id, t.strategy_template_id)
                    onDragIdChange(null)
                  }
            }
          >
            {!hasFilter ? (
              <span
                className={optionCategorySidebarDragClass}
                draggable
                onDragStart={(e) => {
                  onDragIdChange(t.strategy_template_id)
                  e.dataTransfer.setData('application/x-tpl-id', String(t.strategy_template_id))
                  e.dataTransfer.effectAllowed = 'move'
                }}
                onDragEnd={() => onDragIdChange(null)}
              >
                <GripVertical className="h-4 w-4" />
              </span>
            ) : null}
            <button
              type="button"
              className={cn(
                optionCategorySidebarItemBtnClass,
                optionCategorySidebarItemSelectedClass(selectedId === t.strategy_template_id),
              )}
              onClick={() => onSelectId(t.strategy_template_id)}
            >
              <div className="truncate">{t.display_name}</div>
              <div className="truncate font-mono text-[10px] text-muted-foreground">
                {t.template_code}
              </div>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  )
}
