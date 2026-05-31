import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { TabsList, TabsTrigger } from '@/components/ui/tabs'
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
}: Props) {
  const showAccountBubbles = !!(hostAccountId || secondaryAccountId)

  return (
    <div className="flex flex-wrap items-center gap-3 py-2 border-b border-border/60">
      <Input
        placeholder="Symbol"
        value={filterSymbol}
        onChange={(e) => onFilterSymbolChange(e.target.value)}
        className="h-8 w-28 text-sm font-mono"
      />
      <Input
        placeholder="YYYYMMDD"
        value={filterExpiry}
        onChange={(e) => onFilterExpiryChange(e.target.value.replace(/\D/g, '').slice(0, 8))}
        className="h-8 w-28 text-sm font-mono"
        maxLength={8}
        title="Option expiry filter (YYYYMMDD prefix match)"
      />

      {showAccountBubbles && (
        <div className="flex rounded-md border overflow-hidden text-xs">
          {hostAccountId && (
            <button
              type="button"
              onClick={() => onAccountFilterChange({ ...accountFilter, host: !accountFilter.host })}
              className={cn(
                'px-3 py-1 transition-colors font-medium',
                accountFilter.host ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
              )}
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
              className={cn(
                'px-3 py-1 transition-colors font-medium',
                accountFilter.secondary ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
              )}
            >
              Secondary
            </button>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground font-medium">Detail</span>
        <div className="flex rounded-md border overflow-hidden">
          {(['accordion', 'multi'] as const).map((v) => (
            <button
              key={v}
              type="button"
              className={cn(
                'px-2.5 py-1 transition-colors font-medium capitalize',
                detailViewMode === v ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
              )}
              onClick={() => onDetailViewModeChange(v)}
            >
              {v === 'accordion' ? 'Accordion' : 'Multi'}
            </button>
          ))}
        </div>
      </div>

      <span className="w-px h-6 bg-border hidden sm:block" aria-hidden />

      <TabsList variant="line" className="h-8 bg-transparent p-0 gap-0">
        <TabsTrigger value="instance" disabled={!hasInstances && !hasOptions} className="h-8 px-3 text-xs">
          Strategy
        </TabsTrigger>
        <TabsTrigger value="options" disabled={!hasOptions} className="h-8 px-3 text-xs">
          Options
        </TabsTrigger>
        <TabsTrigger value="stocks" disabled={!hasCoreStocks} className="h-8 px-3 text-xs">
          Stocks
        </TabsTrigger>
        <TabsTrigger value="fixed_income" disabled={!hasFixedIncome} className="h-8 px-3 text-xs">
          Fixed income
        </TabsTrigger>
        <TabsTrigger value="cash_like" disabled={!hasCashLike} className="h-8 px-3 text-xs">
          Cash-like
        </TabsTrigger>
      </TabsList>
    </div>
  )
}
