import { InfoTooltip } from '@/components/ui/InfoTooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { segmentButtonClass, segmentGroupClass } from '@/components/data-display'
import {
  LEDGER_SINCE_PRESET_TABS,
  type LedgerSincePreset,
} from '@/utils/ledger/summaryPeriod'
import { MONTH_NAMES } from './ledgerConstants'
import { fmtMdHint } from './ledgerFormat'
import { LedgerSymbolCombobox } from './LedgerSymbolCombobox'
import type { LedgerAccountTab } from './ledgerAccountTabs'
import {
  ledgerFilterPanelClass,
  ledgerFilterRowClass,
  ledgerFilterLabelClass,
} from '@/lib/ledgerUi'

const SINCE_TOOLTIP =
  'Include executions whose trade date falls in a rolling window ending today: 1 month, 1 quarter, half-year, or 1 year back from today\'s date, or year-to-date from Jan 1. Mutually exclusive with expiry year/month.'

const SINCE_PRESET_TABS = LEDGER_SINCE_PRESET_TABS.filter(t => t.id !== 'all')

const COMPACT_SELECT_TRIGGER = 'h-[1.875rem] min-w-[5.5rem] text-[0.8125rem] px-2'

type Props = {
  sincePreset: LedgerSincePreset
  onSincePreset: (preset: LedgerSincePreset) => void
  dateRange: { start: string; end: string }
  accountTabs: LedgerAccountTab[]
  accountFilter: string
  onAccountFilter: (id: string) => void
  symbolFilter: string
  onSymbolFilter: (v: string) => void
  symbolSuggestions: string[]
  structureOptions: string[]
  filterStructure: string
  onFilterStructure: (v: string) => void
  wishlistSymbolOptions: string[]
  filterWishlistSymbol: string
  onFilterWishlistSymbol: (v: string) => void
  expiryFilterYear: string
  onExpiryFilterYear: (v: string) => void
  expiryFilterMonth: string
  onExpiryFilterMonth: (v: string) => void
  expiryYearOptions: number[]
  expiryMonthOptions: number[]
  sinceDisabled: boolean
  activeFilterSummary: string[]
  groupByPosition: boolean
  onToggleGroupByPosition: () => void
  showStkControls: boolean
}

export function LedgerFilterBar({
  sincePreset,
  onSincePreset,
  dateRange,
  accountTabs,
  accountFilter,
  onAccountFilter,
  symbolFilter,
  onSymbolFilter,
  symbolSuggestions,
  structureOptions,
  filterStructure,
  onFilterStructure,
  wishlistSymbolOptions,
  filterWishlistSymbol,
  onFilterWishlistSymbol,
  expiryFilterYear,
  onExpiryFilterYear,
  expiryFilterMonth,
  onExpiryFilterMonth,
  expiryYearOptions,
  expiryMonthOptions,
  sinceDisabled,
  activeFilterSummary,
  groupByPosition,
  onToggleGroupByPosition,
  showStkControls,
}: Props) {
  const sincePresetLabel = SINCE_PRESET_TABS.find(t => t.id === sincePreset)?.label ?? sincePreset

  function clearStructureFilters() {
    onFilterStructure('')
    onFilterWishlistSymbol('')
  }

  function clearExpiryFilters() {
    onExpiryFilterYear('')
    onExpiryFilterMonth('')
  }

  return (
    <div className={ledgerFilterPanelClass} aria-label="Trade ledger quick filters">
      <div className="flex flex-col gap-1.5">
        <div className={ledgerFilterRowClass}>
          <div className="inline-flex flex-wrap items-center gap-x-2 gap-y-1" role="group" aria-label="Since (rolling trade date window)">
            <span className={ledgerFilterLabelClass}>Since</span>
            <InfoTooltip text={SINCE_TOOLTIP} />
            <div className={segmentGroupClass('sm')}>
              <button
                type="button"
                onClick={() => { onSincePreset('all'); clearExpiryFilters() }}
                className={segmentButtonClass(sincePreset === 'all' && !expiryFilterYear, 'sm')}
                aria-pressed={sincePreset === 'all' && !expiryFilterYear}
              >
                All
              </button>
              {SINCE_PRESET_TABS.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => { onSincePreset(t.id); clearExpiryFilters() }}
                  className={segmentButtonClass(sincePreset === t.id && !expiryFilterYear, 'sm')}
                  aria-pressed={sincePreset === t.id && !expiryFilterYear}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {accountTabs.length > 0 && (
            <div className={segmentGroupClass('sm')} role="group" aria-label="Account filter">
              <button
                type="button"
                onClick={() => onAccountFilter('all')}
                className={segmentButtonClass(accountFilter === 'all', 'sm')}
                aria-pressed={accountFilter === 'all'}
              >
                All
              </button>
              {accountTabs.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onAccountFilter(id)}
                  className={segmentButtonClass(accountFilter === id, 'sm')}
                  aria-pressed={accountFilter === id}
                  title={id}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {sincePreset !== 'all' && !expiryFilterYear && (
            <span
              className="inline-flex flex-wrap items-baseline text-[0.6875rem] text-muted-foreground"
              role="status"
              title={`Trade date window: ${dateRange.start} → ${dateRange.end}`}
            >
              <span>
                {fmtMdHint(dateRange.start)}–{fmtMdHint(dateRange.end)}
              </span>
              <span> · </span>
              <span className="font-medium">Since </span>
              <span className="font-bold text-link font-mono tabular-nums">{sincePresetLabel}</span>
            </span>
          )}
        </div>

        <div className={ledgerFilterRowClass}>
          <label className="inline-flex items-center gap-1.5 min-w-0">
            <span className={ledgerFilterLabelClass}>Symbol</span>
            <LedgerSymbolCombobox
              value={symbolFilter}
              onChange={onSymbolFilter}
              suggestions={symbolSuggestions}
              className="min-w-[7.5rem] flex-[1_1_7.5rem] max-w-[12rem]"
            />
          </label>

          {structureOptions.length > 0 && (
            <div className="inline-flex items-center gap-1.5 min-w-0">
              <span className={ledgerFilterLabelClass}>Structure</span>
              <Select
                value={filterStructure || '__all__'}
                onValueChange={v => {
                  onFilterStructure(v === '__all__' ? '' : v)
                  onFilterWishlistSymbol('')
                }}
              >
                <SelectTrigger className={COMPACT_SELECT_TRIGGER} aria-label="Structure filter">
                  <SelectValue placeholder="All structures" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All structures</SelectItem>
                  {structureOptions.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="inline-flex items-center gap-1.5 min-w-0" role="group" aria-label="Expiry filter">
            <span className={ledgerFilterLabelClass}>Expiry</span>
            <div className="inline-flex items-center gap-1.5">
              <Select
                value={expiryFilterYear || '__all__'}
                disabled={sinceDisabled}
                onValueChange={v => {
                  const year = v === '__all__' ? '' : v
                  onExpiryFilterYear(year)
                  onExpiryFilterMonth('')
                  if (year) onSincePreset('all')
                }}
              >
                <SelectTrigger className={COMPACT_SELECT_TRIGGER} aria-label="Expiry year">
                  <SelectValue placeholder="All years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All years</SelectItem>
                  {expiryYearOptions.map(y => (
                    <SelectItem key={y} value={String(y)}>{String(y)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={expiryFilterMonth || '__all__'}
                disabled={sinceDisabled || !expiryFilterYear}
                onValueChange={v => {
                  const month = v === '__all__' ? '' : v
                  onExpiryFilterMonth(month)
                  if (month) onSincePreset('all')
                }}
              >
                <SelectTrigger className={COMPACT_SELECT_TRIGGER} aria-label="Expiry month">
                  <SelectValue placeholder="All months" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All months</SelectItem>
                  {expiryMonthOptions.map(m => (
                    <SelectItem key={m} value={String(m).padStart(2, '0')}>{MONTH_NAMES[m - 1]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {wishlistSymbolOptions.length > 0 && (
            <div className="inline-flex items-center gap-1.5 min-w-0">
              <span className={ledgerFilterLabelClass}>Wishlist</span>
              <Select
                value={filterWishlistSymbol || '__all__'}
                onValueChange={v => onFilterWishlistSymbol(v === '__all__' ? '' : v)}
              >
                <SelectTrigger className={COMPACT_SELECT_TRIGGER} aria-label="Wishlist symbol filter">
                  <SelectValue placeholder="All symbols" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All symbols</SelectItem>
                  {wishlistSymbolOptions.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {(filterStructure || filterWishlistSymbol) && (
            <button type="button" className="text-xs text-link underline underline-offset-2 bg-transparent border-0 p-0 cursor-pointer" onClick={clearStructureFilters}>
              Clear
            </button>
          )}

          {showStkControls && (
            <button
              type="button"
              className={segmentButtonClass(groupByPosition, 'sm')}
              onClick={onToggleGroupByPosition}
              aria-pressed={groupByPosition}
            >
              By Position
            </button>
          )}
        </div>
      </div>

      {activeFilterSummary.length > 0 && (
        <p className="m-0 text-[0.6875rem] text-muted-foreground leading-snug" role="status" aria-label="Active filters">
          {activeFilterSummary.join(' · ')}
        </p>
      )}
    </div>
  )
}
