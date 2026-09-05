/**
 * The grid's own toolbar. Everything here changes only the grid below it.
 *
 * Two views of one book — by strategy (the ranked instance rows) or by
 * contract (every open option flat, sorted the Owner's way) — plus the
 * strategy-side filters, which are hidden in the contract view because they
 * describe strategies, not contracts. Detail mode moved here from the page bar
 * for the same reason: it is about how rows expand, not what the page is about.
 */
import {
  SegmentControl,
  segmentButtonClass as bubbleButtonClass,
  segmentGroupClass as bubbleGroupClass,
} from '@/components/data-display'
import { Button } from '@/components/ui/button'
import { instancePanel } from './instancePanelClasses'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { InstanceFilterValues } from '@/utils/filterInstanceGroups'

export type { InstanceFilterValues }
export type LinesView = 'strategy' | 'contract'
export type DetailViewMode = 'accordion' | 'multi'

export const CLEAR_FILTERS: InstanceFilterValues = {
  structureType: 'all',
  oppName: 'all',
  scopeType: 'all',
  attributionType: 'all',
}

interface Props {
  view: LinesView
  onViewChange: (v: LinesView) => void
  detailViewMode: DetailViewMode
  onDetailViewModeChange: (m: DetailViewMode) => void
  /** Option lists always come from the unfiltered groups, so a chosen value never vanishes from its own menu. */
  structureTypes: string[]
  oppNames: string[]
  scopeTypes: string[]
  values: InstanceFilterValues
  onChange: (values: InstanceFilterValues) => void
  /** "N of M" for the strategy view; the contract view prints its own count. */
  shown: number
  total: number
}

function BubbleRadio({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className={instancePanel.filterBubbleRow}>
      <span className={instancePanel.filterBubbleLabel}>{label}</span>
      <div className={bubbleGroupClass()}>
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={bubbleButtonClass(value === opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function LinesToolbar({
  view,
  onViewChange,
  detailViewMode,
  onDetailViewModeChange,
  structureTypes,
  oppNames,
  scopeTypes,
  values,
  onChange,
  shown,
  total,
}: Props) {
  const hasActiveFilter =
    values.structureType !== 'all' ||
    values.oppName !== 'all' ||
    values.scopeType !== 'all' ||
    values.attributionType !== 'all'

  function update(partial: Partial<InstanceFilterValues>) {
    onChange({ ...values, ...partial })
  }

  const scopeOptions = [
    { value: 'all', label: 'All' },
    { value: '__none__', label: 'None' },
    ...scopeTypes
      .filter((s) => s !== '')
      .map((s) => ({
        value: s,
        label: s === 'watchlist_stk' ? 'Watchlist (stocks)' : s === 'explicit_symbols' ? 'Explicit symbols' : s,
      })),
  ]

  const attrOptions = [
    { value: 'all', label: 'All' },
    { value: 'single', label: 'Single' },
    { value: 'mixed', label: 'Mixed' },
    { value: 'unassigned', label: 'Unassigned' },
  ]

  return (
    <div className={instancePanel.filters} role="toolbar" aria-label="Lines grid">
      <SegmentControl
        size="sm"
        ariaLabel="Lines view"
        options={[
          { value: 'strategy', label: 'Strategies' },
          { value: 'contract', label: 'Contracts' },
        ]}
        value={view}
        onChange={(v) => onViewChange(v as LinesView)}
      />
      {view === 'strategy' ? (
        <>
          <span className="font-mono text-dense-caption tabular-nums text-muted-foreground">
            {shown} / {total}
          </span>
          <Select value={values.structureType} onValueChange={(v) => update({ structureType: v })}>
            <SelectTrigger className="h-7 w-40 shrink-0 text-xs">
              <SelectValue placeholder="All Contract Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Contract Types</SelectItem>
              {structureTypes.map((st) => (
                <SelectItem key={st} value={st}>
                  {st.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={values.oppName} onValueChange={(v) => update({ oppName: v })}>
            <SelectTrigger className="h-7 w-44 shrink-0 text-xs">
              <SelectValue placeholder="All Opportunities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Opportunities</SelectItem>
              {oppNames.map((n) => (
                <SelectItem key={n} value={n}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <BubbleRadio
            label="Symbol scope"
            options={scopeOptions}
            value={values.scopeType}
            onChange={(v) => update({ scopeType: v })}
          />
          <BubbleRadio
            label="Attribution"
            options={attrOptions}
            value={values.attributionType}
            onChange={(v) => update({ attributionType: v })}
          />
          {hasActiveFilter && (
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onChange(CLEAR_FILTERS)}>
              Clear Filters
            </Button>
          )}
        </>
      ) : null}

      <div className="ml-auto flex shrink-0 items-center gap-1" role="radiogroup" aria-label="Detail view mode">
        <span className="whitespace-nowrap text-dense-label font-semibold text-muted-foreground">Detail</span>
        <SegmentControl
          size="sm"
          ariaLabel="Detail view mode"
          options={[
            { value: 'accordion', label: 'Accordion' },
            { value: 'multi', label: 'Multi' },
          ]}
          value={detailViewMode}
          onChange={(v) => onDetailViewModeChange(v as DetailViewMode)}
        />
      </div>
    </div>
  )
}
