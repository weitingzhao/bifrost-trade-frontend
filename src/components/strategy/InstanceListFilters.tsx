import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { SegmentControl } from '@/components/data-display'
import { denseTable } from '@/components/data-display/denseTableClasses'
import type { StrategyInstance, StrategyOpportunity } from '@/types/positions'
import { StrategyOpportunityCombobox } from './StrategyOpportunityCombobox'
import type { DetailViewMode } from './InstanceListToolbar'
import {
  instancesFieldLabelClass,
  instancesFilterBubbleActiveClass,
  instancesFilterBubbleClass,
  instancesFilterFooterClass,
  instancesFilterLabelClass,
  instancesFilterMetaClass,
  instancesFilterPanelClass,
  instancesFilterPrimaryRowClass,
  instancesFilterRowClass,
  instancesInlineFieldClass,
  instancesToolbarClass,
  instancesToolbarLabelClass,
} from './instances/instancesUi'

export type StatusFilter = '' | 'open' | 'closed'
export type SinceFilter = '' | '1m' | 'q' | 'half' | '1y' | 'ytd'
export type RightFilter = '' | 'C' | 'P'

export interface InstanceFilterOptions {
  structures: string[]
  symbols: string[]
  rights: ('C' | 'P')[]
  expiryMonths: string[]
}

export interface InstanceListFilterValues {
  status: StatusFilter
  structure: string
  symbol: string
  right: RightFilter
  expiry: string
  since: SinceFilter
}

interface Props {
  options: InstanceFilterOptions
  values: InstanceListFilterValues
  sinceRangeText: string | null
  filteredCount: number
  totalCount: number
  onChange: (patch: Partial<InstanceListFilterValues>) => void
  onClear: () => void
  accounts: string[]
  accountFilter: string
  onAccountFilterChange: (accountId: string) => void
  opportunities: StrategyOpportunity[]
  opportunityIdFilter: number | ''
  onOpportunityIdFilterChange: (id: number | '') => void
  oppsFetching: boolean
  instancesForOpportunity: StrategyInstance[]
  instanceIdFilter: number | ''
  onInstanceIdFilterChange: (id: number | '') => void
  detailViewMode: DetailViewMode
  onDetailViewModeChange: (mode: DetailViewMode) => void
  onExpandAll: () => void
  onCollapseAll: () => void
  showGroupToolbar: boolean
}

const SINCE_OPTIONS: { key: SinceFilter; label: string }[] = [
  { key: '', label: 'All' },
  { key: '1m', label: '1m' },
  { key: 'q', label: 'Q' },
  { key: 'half', label: '6m' },
  { key: '1y', label: '1y' },
  { key: 'ytd', label: 'YTD' },
]

function fmtExpiryMonthBubble(ym: string): string {
  const [year, month] = ym.split('-')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const m = parseInt(month ?? '', 10) - 1
  if (!year || m < 0 || m > 11 || Number.isNaN(m)) return ym
  return `${months[m]} '${year.slice(2)}`
}

function FilterRow({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn(instancesFilterRowClass, className)} role="group">
      <span className={instancesFilterLabelClass}>{label}</span>
      {children}
    </div>
  )
}

function ToggleBubble({
  active,
  onClick,
  children,
  style,
  title,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  style?: React.CSSProperties
  title?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      title={title}
      className={cn(instancesFilterBubbleClass, active && instancesFilterBubbleActiveClass)}
    >
      {children}
    </button>
  )
}

export function InstanceListFilters({
  options,
  values,
  sinceRangeText,
  filteredCount,
  totalCount,
  onChange,
  onClear,
  accounts,
  accountFilter,
  onAccountFilterChange,
  opportunities,
  opportunityIdFilter,
  onOpportunityIdFilterChange,
  oppsFetching,
  instancesForOpportunity,
  instanceIdFilter,
  onInstanceIdFilterChange,
  detailViewMode,
  onDetailViewModeChange,
  onExpandAll,
  onCollapseAll,
  showGroupToolbar,
}: Props) {
  const hasActive =
    values.status !== '' ||
    values.structure !== '' ||
    values.symbol !== '' ||
    values.right !== '' ||
    values.expiry !== '' ||
    values.since !== '' ||
    instanceIdFilter !== ''

  return (
    <Card variant="elevated">
      <CardContent className="px-3 py-2">
        <div className={instancesFilterPanelClass}>
          <div className={instancesFilterPrimaryRowClass}>
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
              <div className={instancesInlineFieldClass}>
                <Label htmlFor="instances-account" className={instancesFieldLabelClass}>Account</Label>
                <Select
                  value={accountFilter || '__all__'}
                  onValueChange={(v) => onAccountFilterChange(v === '__all__' ? '' : v)}
                >
                  <SelectTrigger id="instances-account" className="h-7 w-[8.5rem] text-xs font-mono">
                    <SelectValue placeholder="All accounts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All accounts</SelectItem>
                    {accounts.map((id) => (
                      <SelectItem key={id} value={id} className="text-xs font-mono">{id}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className={instancesInlineFieldClass}>
                <span className={instancesFieldLabelClass}>Strategy</span>
                <StrategyOpportunityCombobox
                  opportunities={opportunities}
                  value={opportunityIdFilter}
                  disabled={oppsFetching}
                  className="min-w-[10rem]"
                  onChange={(id) => {
                    onOpportunityIdFilterChange(id)
                    onInstanceIdFilterChange('')
                  }}
                />
              </div>

              {opportunityIdFilter !== '' && (
                <div className={instancesInlineFieldClass}>
                  <Label htmlFor="instances-instance" className={instancesFieldLabelClass}>Instance</Label>
                  <Select
                    value={instanceIdFilter === '' ? '__all__' : String(instanceIdFilter)}
                    onValueChange={(v) => onInstanceIdFilterChange(v === '__all__' ? '' : Number(v))}
                  >
                    <SelectTrigger id="instances-instance" className="h-7 w-[8.5rem] text-xs">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All</SelectItem>
                      {instancesForOpportunity.map((si) => (
                        <SelectItem key={si.strategy_instance_id} value={String(si.strategy_instance_id)}>
                          {si.label?.trim() || `#${si.strategy_instance_id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <span className={instancesFilterMetaClass}>
                {filteredCount}/{totalCount}
              </span>
              {hasActive && (
                <Button type="button" variant="link" size="sm" className="h-auto p-0 text-[10px]" onClick={onClear}>
                  Clear
                </Button>
              )}
            </div>
          </div>

          <FilterRow label="Status">
            <SegmentControl
              size="sm"
              ariaLabel="Filter by position status"
              value={values.status || ''}
              onChange={(v) => onChange({ status: v as StatusFilter })}
              options={[
                { value: '', label: 'All' },
                { value: 'open', label: 'Open' },
                { value: 'closed', label: 'Closed' },
              ]}
            />
            {options.rights.length > 1 && (
              <>
                <span className={cn(instancesFilterLabelClass, 'ml-2')}>Type</span>
                <SegmentControl
                  size="sm"
                  ariaLabel="Filter by option right"
                  value={values.right || ''}
                  onChange={(v) => onChange({ right: v as RightFilter })}
                  options={[
                    { value: '', label: 'All' },
                    { value: 'C', label: 'C' },
                    { value: 'P', label: 'P' },
                  ]}
                />
              </>
            )}
            <span className={cn(instancesFilterLabelClass, 'ml-2')}>Since</span>
            <SegmentControl
              size="sm"
              ariaLabel="Filter by opened since"
              value={values.since || ''}
              onChange={(v) => onChange({ since: v as SinceFilter })}
              options={SINCE_OPTIONS.map(({ key, label }) => ({ value: key, label }))}
            />
            {sinceRangeText != null && (
              <span className={cn(denseTable.mutedMeta, 'ml-1')}>{sinceRangeText}</span>
            )}
          </FilterRow>

          {options.structures.length > 0 && (
            <FilterRow label="Struct">
              <ToggleBubble active={values.structure === ''} onClick={() => onChange({ structure: '' })}>
                All
              </ToggleBubble>
              {options.structures.map((s) => (
                <ToggleBubble
                  key={s}
                  active={values.structure === s}
                  onClick={() => onChange({ structure: values.structure === s ? '' : s })}
                  title={s}
                >
                  <span className="inline-block max-w-[9rem] truncate align-bottom">{s}</span>
                </ToggleBubble>
              ))}
            </FilterRow>
          )}

          {options.symbols.length > 0 && (
            <FilterRow label="Symbol">
              <ToggleBubble active={values.symbol === ''} onClick={() => onChange({ symbol: '' })}>
                All
              </ToggleBubble>
              {options.symbols.map((sym) => (
                <ToggleBubble
                  key={sym}
                  active={values.symbol === sym}
                  onClick={() => onChange({ symbol: values.symbol === sym ? '' : sym })}
                >
                  {sym}
                </ToggleBubble>
              ))}
            </FilterRow>
          )}

          {options.expiryMonths.length > 1 && (
            <FilterRow label="Expiry">
              <ToggleBubble active={values.expiry === ''} onClick={() => onChange({ expiry: '' })}>
                All
              </ToggleBubble>
              {options.expiryMonths.map((m) => (
                <ToggleBubble
                  key={m}
                  active={values.expiry === m}
                  onClick={() => onChange({ expiry: values.expiry === m ? '' : m })}
                  title={m}
                >
                  {fmtExpiryMonthBubble(m)}
                </ToggleBubble>
              ))}
            </FilterRow>
          )}

          {showGroupToolbar && (
            <div className={instancesFilterFooterClass}>
              <div className={instancesToolbarClass}>
                <span className={instancesToolbarLabelClass}>
                  View
                  <InfoTooltip
                    text={
                      detailViewMode === 'accordion'
                        ? 'Accordion: only one symbol group expanded at a time.'
                        : 'Multi: several symbol groups may stay expanded.'
                    }
                  />
                </span>
                <SegmentControl
                  size="sm"
                  ariaLabel="Detail view mode"
                  value={detailViewMode}
                  onChange={(v) => onDetailViewModeChange(v as DetailViewMode)}
                  options={[
                    { value: 'accordion', label: 'Accordion' },
                    { value: 'multi', label: 'Multi' },
                  ]}
                />
              </div>
              <div className={instancesToolbarClass}>
                <span className={instancesToolbarLabelClass}>Groups</span>
                <Button type="button" variant="outline" size="sm" className="h-6 px-2 text-[10px]" onClick={onExpandAll}>
                  Expand
                </Button>
                <Button type="button" variant="outline" size="sm" className="h-6 px-2 text-[10px]" onClick={onCollapseAll}>
                  Collapse
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
