/**
 * The grid's own toolbar. Everything here changes only the grid below it.
 *
 * Two views of one book — by strategy (the ranked instance rows) or by
 * contract (every open option flat, sorted the Owner's way) — plus the
 * strategy-side filters, which are hidden in the contract view because they
 * describe strategies, not contracts. Detail mode moved here from the page bar
 * for the same reason: it is about how rows expand, not what the page is about.
 */
import { cn } from '@/lib/utils'
import { DenseTagButton, SegmentControl } from '@/components/data-display'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { positionsUi } from './positionsUi'
import type { InstanceFilterValues } from '@/utils/filterInstanceGroups'

export type { InstanceFilterValues }
export type LinesView = 'strategy' | 'contract' | 'expiries'
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
  /** Dates with legs in scope, for the expiries view's count. */
  expiryCount: number
  /** A leg selected on the risk map narrows every view to it; the chip is the way out. */
  selectionLabel?: string | null
  onClearSelection?: () => void
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
  expiryCount,
  selectionLabel,
  onClearSelection,
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
        label: s === 'watchlist_stk' ? 'Watchlist' : s === 'explicit_symbols' ? 'Explicit' : s,
      })),
  ]

  const attrOptions = [
    { value: 'all', label: 'All' },
    { value: 'single', label: 'Single' },
    { value: 'mixed', label: 'Mixed' },
    { value: 'unassigned', label: 'Unassigned' },
  ]

  const trigger = cn(positionsUi.input, 'h-5.5 font-sans text-dense-meta')

  return (
    <header className={positionsUi.panelHead} role="toolbar" aria-label="Lines grid">
      <SegmentControl
        size="xs"
        ariaLabel="Lines view"
        options={[
          { value: 'strategy', label: 'Strategies' },
          { value: 'contract', label: 'Contracts' },
          { value: 'expiries', label: 'Expiries' },
        ]}
        value={view}
        onChange={(v) => onViewChange(v as LinesView)}
      />
      {selectionLabel ? (
        <DenseTagButton
          variant="category"
          size="cell"
          title="The risk map's selected leg — every view shows only it. Click to clear."
          onClick={onClearSelection}
        >
          Map: {selectionLabel} ×
        </DenseTagButton>
      ) : null}
      {view === 'expiries' ? (
        <span className={cn(positionsUi.mono, 'text-dense-meta leading-normal text-muted-foreground')}>
          {expiryCount} {expiryCount === 1 ? 'date' : 'dates'}
        </span>
      ) : null}
      {view === 'strategy' ? (
        <>
          <span className={cn(positionsUi.mono, 'text-dense-meta leading-normal text-muted-foreground')}>
            {shown} / {total}
          </span>
          <Select value={values.structureType} onValueChange={(v) => update({ structureType: v })}>
            <SelectTrigger className={cn(trigger, 'w-38')} aria-label="Contract type">
              <SelectValue placeholder="All contract types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All contract types</SelectItem>
              {structureTypes.map((st) => (
                <SelectItem key={st} value={st}>
                  {st.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={values.oppName} onValueChange={(v) => update({ oppName: v })}>
            <SelectTrigger className={cn(trigger, 'w-42')} aria-label="Opportunity">
              <SelectValue placeholder="All opportunities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All opportunities</SelectItem>
              {oppNames.map((n) => (
                <SelectItem key={n} value={n}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="flex items-center gap-1.5">
            <span className={positionsUi.cap}>Scope</span>
            <SegmentControl
              size="xs"
              ariaLabel="Scope"
              options={scopeOptions}
              value={values.scopeType}
              onChange={(v) => update({ scopeType: v })}
            />
          </span>
          <span className="flex items-center gap-1.5">
            <span className={positionsUi.cap}>Attribution</span>
            <SegmentControl
              size="xs"
              ariaLabel="Attribution"
              options={attrOptions}
              value={values.attributionType}
              onChange={(v) => update({ attributionType: v })}
            />
          </span>
          {hasActiveFilter && (
            <button type="button" className={positionsUi.btn} onClick={() => onChange(CLEAR_FILTERS)}>
              Clear filters
            </button>
          )}
        </>
      ) : null}

      {view !== 'expiries' ? (
        <span className="ml-auto flex shrink-0 items-center gap-1.5">
          <span className={positionsUi.cap}>Rows</span>
          <SegmentControl
            size="xs"
            ariaLabel="Detail view mode"
            options={[
              { value: 'accordion', label: 'Accordion' },
              { value: 'multi', label: 'Multi' },
            ]}
            value={detailViewMode}
            onChange={(v) => onDetailViewModeChange(v as DetailViewMode)}
          />
        </span>
      ) : null}
    </header>
  )
}
