import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SegmentControl, segmentGroupClass, segmentButtonClass } from '@/components/data-display'
import type { AccountFilter } from './PositionsFilterBar'

export type DetailViewMode = 'accordion' | 'multi'

interface Props {
  filterSymbol: string
  onFilterSymbolChange: (v: string) => void
  filterExpiry: string
  onFilterExpiryChange: (v: string) => void
  hostAccountId?: string
  secondaryAccountId?: string
  accountFilter: AccountFilter
  onAccountFilterChange: (f: AccountFilter) => void
  detailViewMode: DetailViewMode
  onDetailViewModeChange: (m: DetailViewMode) => void
  hasInstances: boolean
  hasOptions: boolean
  hasCoreStocks: boolean
  hasFixedIncome: boolean
  hasCashLike: boolean
  /** Show Strategy/Options/… tabs when portfolio has data (not when account filter clears the list). */
  showPositionTabs: boolean
}

export function PositionsOpenControls({
  filterSymbol,
  onFilterSymbolChange,
  filterExpiry,
  onFilterExpiryChange,
  hostAccountId,
  secondaryAccountId,
  accountFilter,
  onAccountFilterChange,
  detailViewMode,
  onDetailViewModeChange,
  hasInstances,
  hasOptions,
  hasCoreStocks,
  hasFixedIncome,
  hasCashLike,
  showPositionTabs,
}: Props) {
  const showAccountBubbles = !!(hostAccountId || secondaryAccountId)
  const showTabs = showPositionTabs

  return (
    <div
      className="mb-2 flex min-w-0 flex-nowrap items-center gap-x-2 gap-y-1.5 overflow-x-auto border-b border-border/60 py-1.5 [scrollbar-width:thin]"
      role="toolbar"
      aria-label="Open position filters and tabs"
    >
      <div className="flex shrink-0 items-center gap-1.5" aria-label="Position filters">
        <Input
          placeholder="Symbol"
          value={filterSymbol}
          onChange={(e) => onFilterSymbolChange(e.target.value)}
          className="h-8 w-32 min-w-[6.5rem] max-w-40 shrink-0 font-mono text-sm"
        />
        <Input
          placeholder="YYYYMMDD"
          value={filterExpiry}
          onChange={(e) => onFilterExpiryChange(e.target.value.replace(/\D/g, '').slice(0, 8))}
          className="h-8 w-[7.5rem] max-w-36 shrink-0 font-mono text-sm"
          maxLength={8}
          title="Option expiry filter (YYYYMMDD prefix match)"
          aria-label="Filter by option expiry YYYYMMDD"
        />
      </div>

      {showAccountBubbles && (
        <div className={cn(segmentGroupClass(), 'shrink-0 flex-nowrap')}>
          {hostAccountId && (
            <button
              type="button"
              onClick={() => onAccountFilterChange({ ...accountFilter, host: !accountFilter.host })}
              className={segmentButtonClass(accountFilter.host)}
              aria-pressed={accountFilter.host}
            >
              HOST
            </button>
          )}
          {secondaryAccountId && secondaryAccountId !== hostAccountId && (
            <button
              type="button"
              onClick={() =>
                onAccountFilterChange({ ...accountFilter, secondary: !accountFilter.secondary })
              }
              className={segmentButtonClass(accountFilter.secondary)}
              aria-pressed={accountFilter.secondary}
            >
              Secondary
            </button>
          )}
        </div>
      )}

      <div className="flex shrink-0 items-center gap-1" role="radiogroup" aria-label="Detail view mode">
        <span className="whitespace-nowrap text-[0.76rem] font-semibold text-muted-foreground">
          Detail
        </span>
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

      {showTabs && (
        <>
          <span
            className="mx-0.5 min-h-[1.55rem] w-px shrink-0 self-stretch bg-border"
            aria-hidden
          />
          <div className="flex min-w-0 flex-1 items-center">
            <TabsList
              variant="line"
              className="h-auto min-w-0 flex-1 flex-nowrap justify-start gap-x-1 gap-y-0.5 border-b-0 bg-transparent p-0"
            >
              <TabsTrigger
                value="instance"
                disabled={!hasInstances && !hasOptions}
                className={cn(
                  'h-[1.65rem] min-h-0 flex-none whitespace-nowrap px-2 py-[0.18rem] text-[0.76rem]',
                  'group-data-[variant=line]/tabs-list:h-[1.65rem] group-data-[variant=line]/tabs-list:px-2 group-data-[variant=line]/tabs-list:py-[0.18rem]',
                )}
              >
                Strategy
              </TabsTrigger>
              <TabsTrigger
                value="options"
                disabled={!hasOptions}
                className={cn(
                  'h-[1.65rem] min-h-0 flex-none whitespace-nowrap px-2 py-[0.18rem] text-[0.76rem]',
                  'group-data-[variant=line]/tabs-list:h-[1.65rem] group-data-[variant=line]/tabs-list:px-2 group-data-[variant=line]/tabs-list:py-[0.18rem]',
                )}
              >
                Options
              </TabsTrigger>
              <TabsTrigger
                value="stocks"
                disabled={!hasCoreStocks}
                className={cn(
                  'h-[1.65rem] min-h-0 flex-none whitespace-nowrap px-2 py-[0.18rem] text-[0.76rem]',
                  'group-data-[variant=line]/tabs-list:h-[1.65rem] group-data-[variant=line]/tabs-list:px-2 group-data-[variant=line]/tabs-list:py-[0.18rem]',
                )}
              >
                Stocks
              </TabsTrigger>
              <TabsTrigger
                value="fixed_income"
                disabled={!hasFixedIncome}
                className={cn(
                  'h-[1.65rem] min-h-0 flex-none whitespace-nowrap px-2 py-[0.18rem] text-[0.76rem]',
                  'group-data-[variant=line]/tabs-list:h-[1.65rem] group-data-[variant=line]/tabs-list:px-2 group-data-[variant=line]/tabs-list:py-[0.18rem]',
                )}
              >
                Fixed income
              </TabsTrigger>
              <TabsTrigger
                value="cash_like"
                disabled={!hasCashLike}
                className={cn(
                  'h-[1.65rem] min-h-0 flex-none whitespace-nowrap px-2 py-[0.18rem] text-[0.76rem]',
                  'group-data-[variant=line]/tabs-list:h-[1.65rem] group-data-[variant=line]/tabs-list:px-2 group-data-[variant=line]/tabs-list:py-[0.18rem]',
                )}
              >
                Cash-like
              </TabsTrigger>
            </TabsList>
          </div>
        </>
      )}
    </div>
  )
}
