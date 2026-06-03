import { InfoTooltip } from '@/components/ui/InfoTooltip'
import {
  LEDGER_SINCE_PRESET_TABS,
  type LedgerSincePreset,
} from '@/utils/ledger/summaryPeriod'
import { MONTH_NAMES } from './ledgerConstants'
import { fmtMdHint } from './ledgerFormat'
import { LedgerSymbolCombobox } from './LedgerSymbolCombobox'
import type { LedgerAccountTab } from './ledgerAccountTabs'
import {
  ledgerBubbleBtn,
  ledgerFilterPanelClass,
  ledgerFilterRowClass,
  ledgerFilterLabelClass,
} from '@/lib/ledgerUi'
const SINCE_TOOLTIP =
  'Include executions whose trade date falls in a rolling window ending today: 1 month, 1 quarter, half-year, or 1 year back from today\'s date, or year-to-date from Jan 1. Mutually exclusive with expiry year/month.'

const SINCE_PRESET_TABS = LEDGER_SINCE_PRESET_TABS.filter(t => t.id !== 'all')

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

function BubbleButton({
  active,
  onClick,
  children,
  title,
  disabled,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  title?: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={ledgerBubbleBtn(active)}
      aria-pressed={active}
    >
      {children}
    </button>
  )
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
      <div className="flex flex-col gap-2.5">
        <div className={ledgerFilterRowClass}>
          <div className="inline-flex flex-wrap items-center gap-x-2 gap-y-1" role="group" aria-label="Since (rolling trade date window)">
            <span className={ledgerFilterLabelClass}>Since</span>
            <InfoTooltip text={SINCE_TOOLTIP} />
            <div className="inline-flex flex-wrap gap-0.5 items-center">
              <BubbleButton
                active={sincePreset === 'all' && !expiryFilterYear}
                onClick={() => { onSincePreset('all'); clearExpiryFilters() }}
              >
                All
              </BubbleButton>
              {SINCE_PRESET_TABS.map(t => (
                <BubbleButton
                  key={t.id}
                  active={sincePreset === t.id && !expiryFilterYear}
                  onClick={() => { onSincePreset(t.id); clearExpiryFilters() }}
                >
                  {t.label}
                </BubbleButton>
              ))}
            </div>
          </div>

          {accountTabs.length > 0 && (
            <div className="inline-flex flex-wrap gap-0.5 items-center" role="group" aria-label="Account filter">
              <BubbleButton
                active={accountFilter === 'all'}
                onClick={() => onAccountFilter('all')}
              >
                All
              </BubbleButton>
              {accountTabs.map(({ id, label }) => (
                <BubbleButton
                  key={id}
                  active={accountFilter === id}
                  onClick={() => onAccountFilter(id)}
                  title={id}
                >
                  {label}
                </BubbleButton>
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
            <label className="inline-flex items-center gap-1.5 min-w-0">
              <span className={ledgerFilterLabelClass}>Structure</span>
              <select
                className="h-[1.875rem] min-w-[6.5rem] rounded-sm border border-border bg-background text-[0.8125rem] px-2"
                value={filterStructure}
                onChange={e => {
                  onFilterStructure(e.target.value)
                  onFilterWishlistSymbol('')
                }}
                aria-label="Structure filter"
              >
                <option value="">All structures</option>
                {structureOptions.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
          )}

          <div className="inline-flex items-center gap-1.5 min-w-0" role="group" aria-label="Expiry filter">
            <span className={ledgerFilterLabelClass}>Expiry</span>
            <div className="inline-flex items-center gap-1.5">
              <select
                className="h-[1.875rem] min-w-[5.5rem] rounded-sm border border-border bg-background text-[0.8125rem] px-2 disabled:opacity-45"
                value={expiryFilterYear}
                disabled={sinceDisabled}
                onChange={e => {
                  onExpiryFilterYear(e.target.value)
                  onExpiryFilterMonth('')
                  if (e.target.value) onSincePreset('all')
                }}
                aria-label="Expiry year"
              >
                <option value="">All years</option>
                {expiryYearOptions.map(y => (
                  <option key={y} value={String(y)}>{y}</option>
                ))}
              </select>
              <select
                className="h-[1.875rem] min-w-[4.5rem] rounded-sm border border-border bg-background text-[0.8125rem] px-2 disabled:opacity-45"
                value={expiryFilterMonth}
                disabled={sinceDisabled || !expiryFilterYear}
                onChange={e => {
                  onExpiryFilterMonth(e.target.value)
                  if (e.target.value) onSincePreset('all')
                }}
                aria-label="Expiry month"
              >
                <option value="">All months</option>
                {expiryMonthOptions.map(m => (
                  <option key={m} value={String(m).padStart(2, '0')}>{MONTH_NAMES[m - 1]}</option>
                ))}
              </select>
            </div>
          </div>

          {wishlistSymbolOptions.length > 0 && (
            <label className="inline-flex items-center gap-1.5 min-w-0">
              <span className={ledgerFilterLabelClass}>Wishlist</span>
              <select
                className="h-[1.875rem] min-w-[6.5rem] rounded-sm border border-border bg-background text-[0.8125rem] px-2"
                value={filterWishlistSymbol}
                onChange={e => onFilterWishlistSymbol(e.target.value)}
                aria-label="Wishlist symbol filter"
              >
                <option value="">All symbols</option>
                {wishlistSymbolOptions.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
          )}

          {(filterStructure || filterWishlistSymbol) && (
            <button type="button" className="text-xs text-link underline underline-offset-2 bg-transparent border-0 p-0 cursor-pointer" onClick={clearStructureFilters}>
              Clear
            </button>
          )}

          {showStkControls && (
            <BubbleButton active={groupByPosition} onClick={onToggleGroupByPosition}>
              By Position
            </BubbleButton>
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
