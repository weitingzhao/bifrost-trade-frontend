import type { QuoteItem, WatchlistItem } from '@/types/market'
import type { PositionCategory } from '@/types/portfolio'
import type { IbPositionRow } from '@/types/monitor'
import { StockWatchlistTable, OptionWatchlistTable } from './StockWatchlistTable'
import type { WatchlistWorkflow } from '@/hooks/useWatchlistWorkflow'
import { WL_CAT_WATCHING } from '@/utils/watchlistHelpers'
import { Button } from '@/components/ui/button'
import { positionToContractKey } from '@/utils/watchlistHelpers'

interface Props {
  workflow: WatchlistWorkflow
  categories: PositionCategory[]
  quoteBySymbol: Record<string, QuoteItem>
  quoteByContractKey: Record<string, QuoteItem>
  watchingCategoryId: number | null
  showPositionPicker: boolean
  positionsNotInWatchlist: IbPositionRow[]
  addPending: boolean
  itemCount: number
  onSymbolClick: (item: WatchlistItem) => void
  onToggleOptionable: (item: WatchlistItem) => void
  onCategoryChange: (item: WatchlistItem, categoryId: number | null) => void
  onRemove: (item: WatchlistItem) => void
  onAddOption: (item: WatchlistItem) => void
  onAddFromPosition: (p: IbPositionRow) => void
}

export function WatchingTab({
  workflow,
  categories,
  quoteBySymbol,
  quoteByContractKey,
  watchingCategoryId,
  showPositionPicker,
  positionsNotInWatchlist,
  addPending,
  itemCount,
  onSymbolClick,
  onToggleOptionable,
  onCategoryChange,
  onRemove,
  onAddOption,
  onAddFromPosition,
}: Props) {
  const {
    watchingStockRows,
    otherCategoryStockRows,
    watchingOptionRows,
    hasPosition,
    symbolFromItem,
  } = workflow

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        <strong className="text-foreground">Step 1.</strong> Tickers you add in the header are stored with
        category <strong>{WL_CAT_WATCHING}</strong> (same names as Portfolio → Accounts).
      </p>

      {watchingCategoryId == null && (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          The <strong>Watching</strong> category is missing or still being created. Add{' '}
          <strong>Watching</strong> and <strong>Sizing</strong> under Portfolio → Accounts if this persists.
        </p>
      )}

      {showPositionPicker && positionsNotInWatchlist.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 rounded-lg border bg-muted/30">
          {positionsNotInWatchlist.map((p, idx) => {
            const ck = positionToContractKey(p)
            const label = p.symbol || ck.split('|')[0]
            return (
              <Button
                key={ck + String(idx)}
                type="button"
                variant="outline"
                size="sm"
                className="font-mono text-xs"
                disabled={addPending}
                onClick={() => onAddFromPosition(p)}
                title={ck}
              >
                {label}
              </Button>
            )
          })}
        </div>
      )}

      {itemCount === 0 &&
        watchingStockRows.length === 0 &&
        watchingOptionRows.length === 0 && (
        <p className="text-sm text-muted-foreground py-6 text-center">
          No symbols yet. Type a ticker in the header to start in Watching.
        </p>
      )}

      {watchingStockRows.length === 0 && otherCategoryStockRows.length === 0 ? (
        itemCount > 0 ? (
          <p className="text-sm text-muted-foreground">No stock rows in Watching / uncategorized.</p>
        ) : null
      ) : (
        <>
          <StockWatchlistTable
            items={watchingStockRows}
            categories={categories}
            quoteBySymbol={quoteBySymbol}
            quoteByContractKey={quoteByContractKey}
            hasPosition={hasPosition}
            onSymbolClick={onSymbolClick}
            onToggleOptionable={onToggleOptionable}
            onCategoryChange={onCategoryChange}
            onRemove={onRemove}
            onAddOption={onAddOption}
            symbolFromItem={symbolFromItem}
          />
          {otherCategoryStockRows.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Other portfolio categories ({otherCategoryStockRows.length})
              </p>
              <StockWatchlistTable
                items={otherCategoryStockRows}
                categories={categories}
                quoteBySymbol={quoteBySymbol}
                quoteByContractKey={quoteByContractKey}
                hasPosition={hasPosition}
                onSymbolClick={onSymbolClick}
                onToggleOptionable={onToggleOptionable}
                onCategoryChange={onCategoryChange}
                onRemove={onRemove}
                onAddOption={onAddOption}
                symbolFromItem={symbolFromItem}
              />
            </div>
          )}
        </>
      )}

      {watchingOptionRows.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Options on the list (Watching / uncategorized)</p>
          <OptionWatchlistTable
            items={watchingOptionRows}
            categories={categories}
            quoteBySymbol={quoteBySymbol}
            quoteByContractKey={quoteByContractKey}
            hasPosition={hasPosition}
            onSymbolClick={onSymbolClick}
            onCategoryChange={onCategoryChange}
            onRemove={onRemove}
            symbolFromItem={symbolFromItem}
          />
        </div>
      )}
    </div>
  )
}
