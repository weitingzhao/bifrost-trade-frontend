import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { QuoteItem, WatchlistItem } from '@/types/market'
import type { PositionCategory } from '@/types/portfolio'
import { StockWatchlistTable, OptionWatchlistTable } from './StockWatchlistTable'
import type { WatchlistWorkflow } from '@/hooks/useWatchlistWorkflow'

interface Props {
  workflow: WatchlistWorkflow
  categories: PositionCategory[]
  quoteBySymbol: Record<string, QuoteItem>
  quoteByContractKey: Record<string, QuoteItem>
  onSymbolClick: (item: WatchlistItem) => void
  onToggleOptionable: (item: WatchlistItem) => void
  onCategoryChange: (item: WatchlistItem, categoryId: number | null) => void
  onRemove: (item: WatchlistItem) => void
  onAddOption: (item: WatchlistItem) => void
}

export function PositionsTab({
  workflow,
  categories,
  quoteBySymbol,
  quoteByContractKey,
  onSymbolClick,
  onToggleOptionable,
  onCategoryChange,
  onRemove,
  onAddOption,
}: Props) {
  const [subTab, setSubTab] = useState<'stocks' | 'options'>('stocks')
  const {
    positionStockRows,
    positionOptRows,
    hasPosition,
    symbolFromItem,
  } = workflow

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        <strong className="text-foreground">Step 3.</strong> Rows on this list that match your current IB
        portfolio snapshot.
      </p>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Instrument type:</span>
        <button
          type="button"
          className={cn(
            'text-xs px-3 py-1 rounded-md border',
            subTab === 'stocks' ? 'bg-primary text-primary-foreground border-primary' : 'border-border',
          )}
          onClick={() => setSubTab('stocks')}
        >
          Stocks <span className="font-mono ml-1">{positionStockRows.length}</span>
        </button>
        <button
          type="button"
          className={cn(
            'text-xs px-3 py-1 rounded-md border',
            subTab === 'options' ? 'bg-primary text-primary-foreground border-primary' : 'border-border',
          )}
          onClick={() => setSubTab('options')}
        >
          Options <span className="font-mono ml-1">{positionOptRows.length}</span>
        </button>
      </div>

      {subTab === 'stocks' && (
        positionStockRows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No held stocks from this list.</p>
        ) : (
          <StockWatchlistTable
            items={positionStockRows}
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
        )
      )}

      {subTab === 'options' && (
        positionOptRows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No held options from this list.</p>
        ) : (
          <OptionWatchlistTable
            items={positionOptRows}
            categories={categories}
            quoteBySymbol={quoteBySymbol}
            quoteByContractKey={quoteByContractKey}
            hasPosition={hasPosition}
            onSymbolClick={onSymbolClick}
            onCategoryChange={onCategoryChange}
            onRemove={onRemove}
            symbolFromItem={symbolFromItem}
          />
        )
      )}
    </div>
  )
}
