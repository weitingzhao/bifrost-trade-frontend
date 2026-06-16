import { useState } from 'react'
import { SegmentControl } from '@/components/data-display'
import type { QuoteItem, WatchlistItem } from '@/types/market'
import type { PositionCategory } from '@/types/portfolio'
import { StockWatchlistTable, OptionWatchlistTable } from './StockWatchlistTable'
import type { WatchlistWorkflow } from '@/hooks/useWatchlistWorkflow'
import { watchlistSectionHintClass, watchlistStepLeadClass } from './watchlistUi'

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
    <div className="space-y-3">
      <p className={watchlistSectionHintClass}>
        <strong className={watchlistStepLeadClass}>Step 3.</strong> Rows on this list that match your current IB
        portfolio snapshot.
      </p>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Instrument type:</span>
        <SegmentControl
          ariaLabel="Instrument type"
          value={subTab}
          onChange={v => setSubTab(v as 'stocks' | 'options')}
          options={[
            {
              value: 'stocks',
              label: (
                <>
                  Stocks <span className="ml-1 font-mono">{positionStockRows.length}</span>
                </>
              ),
            },
            {
              value: 'options',
              label: (
                <>
                  Options <span className="ml-1 font-mono">{positionOptRows.length}</span>
                </>
              ),
            },
          ]}
        />
      </div>

      {subTab === 'stocks' && (
        positionStockRows.length === 0 ? (
          <p className={watchlistSectionHintClass}>No held stocks from this list.</p>
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
          <p className={watchlistSectionHintClass}>No held options from this list.</p>
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
