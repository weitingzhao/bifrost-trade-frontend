import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { AccountFilter } from './PositionsFilterBar'
import { bubbleButtonClass, bubbleGroupClass } from './charts/bubbleSwitchStyles'
import styles from './PositionsOpenControls.module.css'

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
    <div className={styles.row} role="toolbar" aria-label="Open position filters and tabs">
      <div className={styles.filters} aria-label="Position filters">
        <Input
          placeholder="Symbol"
          value={filterSymbol}
          onChange={(e) => onFilterSymbolChange(e.target.value)}
          className={cn('h-8 text-sm font-mono shrink-0', styles.symbolInput)}
        />
        <Input
          placeholder="YYYYMMDD"
          value={filterExpiry}
          onChange={(e) => onFilterExpiryChange(e.target.value.replace(/\D/g, '').slice(0, 8))}
          className={cn('h-8 text-sm font-mono shrink-0', styles.expiryInput)}
          maxLength={8}
          title="Option expiry filter (YYYYMMDD prefix match)"
          aria-label="Filter by option expiry YYYYMMDD"
        />
      </div>

      {showAccountBubbles && (
        <div className={cn(bubbleGroupClass(), styles.acctBubbles)}>
          {hostAccountId && (
            <button
              type="button"
              onClick={() => onAccountFilterChange({ ...accountFilter, host: !accountFilter.host })}
              className={bubbleButtonClass(accountFilter.host)}
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
              className={bubbleButtonClass(accountFilter.secondary)}
              aria-pressed={accountFilter.secondary}
            >
              Secondary
            </button>
          )}
        </div>
      )}

      <div className={styles.detailGroup} role="radiogroup" aria-label="Detail view mode">
        <span className={styles.detailLabel}>Detail</span>
        <div className={bubbleGroupClass()}>
          {(['accordion', 'multi'] as const).map((v) => (
            <button
              key={v}
              type="button"
              className={bubbleButtonClass(detailViewMode === v)}
              onClick={() => onDetailViewModeChange(v)}
              aria-pressed={detailViewMode === v}
            >
              {v === 'accordion' ? 'Accordion' : 'Multi'}
            </button>
          ))}
        </div>
      </div>

      {showTabs && (
        <>
          <span className={styles.sep} aria-hidden />
          <div className={styles.tabsWrap}>
            <TabsList
              variant="line"
              className={cn(
                'w-auto flex-1 min-w-0 border-b-0 flex-nowrap gap-x-1 gap-y-0.5 justify-start h-auto bg-transparent p-0',
                styles.tabsList,
              )}
            >
              <TabsTrigger
                value="instance"
                disabled={!hasInstances && !hasOptions}
                className={cn(
                  'h-[1.65rem] min-h-0 px-2 py-[0.18rem] text-[0.76rem] flex-none whitespace-nowrap',
                  'group-data-[variant=line]/tabs-list:h-[1.65rem] group-data-[variant=line]/tabs-list:px-2 group-data-[variant=line]/tabs-list:py-[0.18rem]',
                )}
              >
                Strategy
              </TabsTrigger>
              <TabsTrigger
                value="options"
                disabled={!hasOptions}
                className={cn(
                  'h-[1.65rem] min-h-0 px-2 py-[0.18rem] text-[0.76rem] flex-none whitespace-nowrap',
                  'group-data-[variant=line]/tabs-list:h-[1.65rem] group-data-[variant=line]/tabs-list:px-2 group-data-[variant=line]/tabs-list:py-[0.18rem]',
                )}
              >
                Options
              </TabsTrigger>
              <TabsTrigger
                value="stocks"
                disabled={!hasCoreStocks}
                className={cn(
                  'h-[1.65rem] min-h-0 px-2 py-[0.18rem] text-[0.76rem] flex-none whitespace-nowrap',
                  'group-data-[variant=line]/tabs-list:h-[1.65rem] group-data-[variant=line]/tabs-list:px-2 group-data-[variant=line]/tabs-list:py-[0.18rem]',
                )}
              >
                Stocks
              </TabsTrigger>
              <TabsTrigger
                value="fixed_income"
                disabled={!hasFixedIncome}
                className={cn(
                  'h-[1.65rem] min-h-0 px-2 py-[0.18rem] text-[0.76rem] flex-none whitespace-nowrap',
                  'group-data-[variant=line]/tabs-list:h-[1.65rem] group-data-[variant=line]/tabs-list:px-2 group-data-[variant=line]/tabs-list:py-[0.18rem]',
                )}
              >
                Fixed income
              </TabsTrigger>
              <TabsTrigger
                value="cash_like"
                disabled={!hasCashLike}
                className={cn(
                  'h-[1.65rem] min-h-0 px-2 py-[0.18rem] text-[0.76rem] flex-none whitespace-nowrap',
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
