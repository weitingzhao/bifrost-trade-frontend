/**
 * `2 · Structure` and `3 · Filters` — the rail's other two steps.
 *
 * The symbol box moved out into `1 · Underlyings`, where the design puts it:
 * a list arrives from a source, and typing one is the exception rather than
 * the way in. What is left is the two questions the design numbers — what
 * shape am I looking for, and how tight.
 *
 * The Run button stays, against the design's *"live — no Run button"*: the
 * call measures 15–31 seconds on DEV, so a live re-run would fire a
 * half-minute request per slider drag. The design's phrase describes a
 * prototype that computes its chain in the browser.
 */
import { Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { SegmentControl } from '@/components/data-display'
import type { ScreenerFilters } from '@/types/research'
import { STRUCTURE_TYPES } from './optionScreenerConstants'
import { OptionScreenerNumInput } from './OptionScreenerNumInput'
import {
  optionScreenerFilterLabelClass,
  optionScreenerFilterPanelClass,
} from './optionScreenerUi'

type Props = {
  filters: ScreenerFilters
  isPending: boolean
  onFiltersChange: (updater: (f: ScreenerFilters) => ScreenerFilters) => void
  onRun: () => void
}

export function OptionScreenerFilterPanel({ filters, isPending, onFiltersChange, onRun }: Props) {
  return (
    <div className={optionScreenerFilterPanelClass}>
      <div className="space-y-1">
        <Label className={optionScreenerFilterLabelClass}>2 · Structure</Label>
        <SegmentControl
          ariaLabel="Structure type"
          className="flex-wrap"
          value={filters.structure_type}
          onChange={v => onFiltersChange(f => ({ ...f, structure_type: v }))}
          options={STRUCTURE_TYPES.map(st => ({
            value: st.value,
            label: st.enabled ? st.label : `${st.label} (V2)`,
            disabled: !st.enabled,
          }))}
        />
        {/* The design says which of its four the engine can answer; so does
            this. Three are drawn and refused rather than hidden, because a
            structure missing from the picker reads as a structure nobody
            trades. */}
        <p className="text-dense-caption leading-relaxed text-muted-foreground">
          Cash-secured put is the one the engine screens. The other three are drawn and refused —
          the spread structures need two legs priced together, which it does not do yet.
        </p>
      </div>

      <div className="space-y-1">
        <Label className={optionScreenerFilterLabelClass}>3 · Filters</Label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <OptionScreenerNumInput
          label="DTE Min"
          value={filters.dte_min}
          onChange={v => onFiltersChange(f => ({ ...f, dte_min: v }))}
          placeholder="14"
        />
        <OptionScreenerNumInput
          label="DTE Max"
          value={filters.dte_max}
          onChange={v => onFiltersChange(f => ({ ...f, dte_max: v }))}
          placeholder="45"
        />
        <OptionScreenerNumInput
          label="Max P(ITM) (0–1)"
          value={filters.max_prob_itm}
          onChange={v => onFiltersChange(f => ({ ...f, max_prob_itm: v }))}
          placeholder="0.30"
        />
        <OptionScreenerNumInput
          label="Min Ann. Return (0–1)"
          value={filters.min_annualized_return}
          onChange={v => onFiltersChange(f => ({ ...f, min_annualized_return: v }))}
        />
        <OptionScreenerNumInput
          label="Max Spread % (0–1)"
          value={filters.max_spread_pct}
          onChange={v => onFiltersChange(f => ({ ...f, max_spread_pct: v }))}
        />
        <OptionScreenerNumInput
          label="Min Premium ($)"
          value={filters.min_premium}
          onChange={v => onFiltersChange(f => ({ ...f, min_premium: v }))}
        />
      </div>

      <div className="flex items-center gap-3">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 rounded border-border"
            checked={filters.include_earnings_span}
            onChange={e =>
              onFiltersChange(f => ({ ...f, include_earnings_span: e.target.checked }))
            }
          />
          <span className="text-xs text-muted-foreground">Include earnings span</span>
        </label>

        <Button type="button" size="sm" onClick={onRun} disabled={isPending} className="ml-auto">
          <Play className="mr-1.5 h-3.5 w-3.5" />
          {isPending ? 'Scanning…' : 'Run Screener'}
        </Button>
      </div>
    </div>
  )
}
