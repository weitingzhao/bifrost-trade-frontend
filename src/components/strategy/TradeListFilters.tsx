import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { SegmentControl } from '@/components/data-display'
import { denseTable } from '@/components/data-display'
import type { Trade, StrategyOpportunity } from '@/types/positions'
import { StrategyOpportunityCombobox } from './StrategyOpportunityCombobox'
import type { DetailViewMode } from './TradeListToolbar'
import {
  tradesFieldLabelClass,
  tradesFilterBubbleActiveClass,
  tradesFilterBubbleClass,
  tradesFilterFooterClass,
  tradesFilterLabelClass,
  tradesFilterMetaClass,
  tradesFilterPanelClass,
  tradesFilterPrimaryRowClass,
  tradesFilterRowClass,
  tradesInlineFieldClass,
  tradesToolbarClass,
  tradesToolbarLabelClass,
} from './trades/tradesUi'

export type StatusFilter = '' | 'open' | 'closed'
export type SinceFilter = '' | '1m' | 'q' | 'half' | '1y' | 'ytd'
export type RightFilter = '' | 'C' | 'P'

export interface TradeFilterOptions {
  structures: string[]
  symbols: string[]
  rights: ('C' | 'P')[]
  expiryMonths: string[]
}

export interface TradeListFilterValues {
  status: StatusFilter
  structure: string
  symbol: string
  right: RightFilter
  expiry: string
  since: SinceFilter
}

interface Props {
  options: TradeFilterOptions
  values: TradeListFilterValues
  sinceRangeText: string | null
  filteredCount: number
  totalCount: number
  onChange: (patch: Partial<TradeListFilterValues>) => void
  onClear: () => void
  /**
   * The account / opportunity / instance pickers, and the accordion switch.
   *
   * Optional since 2026-09-18: Trading › Rules shows this list under a chain node
   * that has already narrowed by opportunity and allocation, so offering the
   * same narrowing twice would let a reader set the two against each other.
   * Omitting them drops those controls and keeps the rest.
   */
  accounts?: string[]
  accountFilter?: string
  onAccountFilterChange?: (accountId: string) => void
  opportunities?: StrategyOpportunity[]
  opportunityIdFilter?: number | ''
  onOpportunityIdFilterChange?: (id: number | '') => void
  oppsFetching?: boolean
  tradesForOpportunity?: Trade[]
  tradeIdFilter?: number | ''
  onTradeIdFilterChange?: (id: number | '') => void
  detailViewMode?: DetailViewMode
  onDetailViewModeChange?: (mode: DetailViewMode) => void
  onExpandAll: () => void
  onCollapseAll: () => void
  showGroupToolbar: boolean
  /** Trading › Rules narrows by symbol through the lens, not this row (Rev .101). */
  hideSymbol?: boolean
  /** Extra controls on the group row (Rules' Group: Symbol / None). */
  groupSlot?: ReactNode
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
    <div className={cn(tradesFilterRowClass, className)} role="group">
      <span className={tradesFilterLabelClass}>{label}</span>
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
      className={cn(tradesFilterBubbleClass, active && tradesFilterBubbleActiveClass)}
    >
      {children}
    </button>
  )
}

export function TradeListFilters({
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
  tradesForOpportunity,
  tradeIdFilter,
  onTradeIdFilterChange,
  detailViewMode,
  onDetailViewModeChange,
  onExpandAll,
  onCollapseAll,
  showGroupToolbar,
  hideSymbol = false,
  groupSlot,
}: Props) {
  const hasActive =
    values.status !== '' ||
    values.structure !== '' ||
    values.symbol !== '' ||
    values.right !== '' ||
    values.expiry !== '' ||
    values.since !== '' ||
    tradeIdFilter !== ''

  return (
    <Card variant="elevated">
      <CardContent className="px-3 py-2">
        <div className={tradesFilterPanelClass}>
          <div className={tradesFilterPrimaryRowClass}>
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
              {onAccountFilterChange ? (
              <div className={tradesInlineFieldClass}>
                <Label htmlFor="trades-account" className={tradesFieldLabelClass}>Account</Label>
                <Select
                  value={accountFilter || '__all__'}
                  onValueChange={(v) => onAccountFilterChange(v === '__all__' ? '' : v)}
                >
                  <SelectTrigger id="trades-account" className="h-7 w-[8.5rem] text-xs font-mono">
                    <SelectValue placeholder="All accounts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All accounts</SelectItem>
                    {(accounts ?? []).map((id) => (
                      <SelectItem key={id} value={id} className="text-xs font-mono">{id}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              ) : null}

              {onOpportunityIdFilterChange ? (
              <div className={tradesInlineFieldClass}>
                <span className={tradesFieldLabelClass}>Strategy</span>
                <StrategyOpportunityCombobox
                  opportunities={opportunities ?? []}
                  value={opportunityIdFilter ?? ''}
                  disabled={oppsFetching}
                  className="min-w-[10rem]"
                  onChange={(id) => {
                    onOpportunityIdFilterChange(id)
                    onTradeIdFilterChange?.('')
                  }}
                />
              </div>
              ) : null}

              {onTradeIdFilterChange && opportunityIdFilter !== '' && opportunityIdFilter != null && (
                <div className={tradesInlineFieldClass}>
                  <Label htmlFor="trades-trade" className={tradesFieldLabelClass}>Trade</Label>
                  <Select
                    value={tradeIdFilter === '' ? '__all__' : String(tradeIdFilter)}
                    onValueChange={(v) => onTradeIdFilterChange(v === '__all__' ? '' : Number(v))}
                  >
                    <SelectTrigger id="trades-trade" className="h-7 w-[8.5rem] text-xs">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All</SelectItem>
                      {(tradesForOpportunity ?? []).map((si) => (
                        <SelectItem key={si.trade_id} value={String(si.trade_id)}>
                          {si.label?.trim() || `#${si.trade_id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <span className={tradesFilterMetaClass}>
                {filteredCount}/{totalCount}
              </span>
              {hasActive && (
                <Button type="button" variant="link" size="sm" className="h-auto p-0 text-dense-caption" onClick={onClear}>
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
                <span className={cn(tradesFilterLabelClass, 'ml-2')}>Type</span>
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
            <span className={cn(tradesFilterLabelClass, 'ml-2')}>Since</span>
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

          {/* Rev .101: a filter with one value filters nothing — not drawn. */}
          {options.structures.length > 1 && (
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

          {!hideSymbol && options.symbols.length > 0 && (
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
            <div className={tradesFilterFooterClass}>
              {onDetailViewModeChange ? (
              <div className={tradesToolbarClass}>
                <span className={tradesToolbarLabelClass}>
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
                  value={detailViewMode ?? 'multi'}
                  onChange={(v) => onDetailViewModeChange?.(v as DetailViewMode)}
                  options={[
                    { value: 'accordion', label: 'Accordion' },
                    { value: 'multi', label: 'Multi' },
                  ]}
                />
              </div>
              ) : null}
              {groupSlot}
              <div className={tradesToolbarClass}>
                <span className={tradesToolbarLabelClass}>Groups</span>
                <Button type="button" variant="outline" size="sm" className="h-6 px-2 text-dense-caption" onClick={onExpandAll}>
                  Expand
                </Button>
                <Button type="button" variant="outline" size="sm" className="h-6 px-2 text-dense-caption" onClick={onCollapseAll}>
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
